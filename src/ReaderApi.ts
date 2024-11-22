import Epub, { Book, Location, Rendition } from 'epubjs';
import Section from "epubjs/types/section";

declare global {
    interface Window {
        appApi: any;
        readerApi: ReaderApi;
    }
}

export class ReaderApi {
    private book: Book;
    private rendition: Rendition;
    private appApi: any;
    private isRtl: boolean;

    constructor() {
        this.book = Epub("book.epub");
        this.rendition = this.book.renderTo("app", {
            width: "100vw",
            height: "100vh",
        });
    }

    /**
     * The entry point of the reader.
     * @param {string | null} destination
     * @param {string | null} savedLocation
     */
    main(destination: string | null = undefined, savedLocation: string | null = undefined): void {
        this.book.ready.then(() => {
            // this.book.locations.break = 10;

            // Load the saved locations.
            if (!!savedLocation) {
                this.book.locations.load(savedLocation as string);
                return Promise.resolve([]);
            }

            // Generate the locations
            let promises: Promise<any>[] = [];
            this.book.spine.each((section: Section) => {
                promises.push(this.book.locations.process(section));
            });
            return Promise.all(promises);
        }).then((_) => {
            const locationJSON = this.book.locations.save();
            if (!savedLocation) {
                // Send the list of locations.
                this.sendToApp('saveLocation', locationJSON);
            }

            // The "process" method didn't update the "total" property in the "Locations".
            // Load the locations again to make it update the "total" value.
            this.book.locations.load(locationJSON);

            // Send the location information to the server after the page is relocated.
            this.rendition.on('relocated', (location: Location) => {
                const breadcrumb: string = this.getBreadcrumb(this.book.navigation.toc, location.start.href);
                const isRtl: boolean = this.isRtl = this.rendition.settings.defaultDirection === 'rtl';
                const avgPercentage = (location.start.percentage + location.end.percentage) / 2;
                this.sendToApp('setState', {
                    atStart: location.atStart ?? false,
                    atEnd: location.atEnd ?? false,
                    startCfi: location.start.cfi,
                    breadcrumb: breadcrumb,
                    chapterFileName: location.start.href,
                    isRtl: isRtl,
                    localCurrent: location.start.displayed.page,
                    localTotal: location.start.displayed.total,
                    percentage: avgPercentage,
                });
            });

            return this.goto(destination);
        }).then(() => {
            this.sendToApp('loadDone');

            this.setThemeData({
                "html, body": {
                    "touch-action": "none",
                },
            });
        });
    }

    /**
     * Navigates to the previous page.
     * @returns {Promise<void>}
     */
    prevPage(): Promise<void> {
        return this.rendition.prev();
    };

    /**
     * Navigates to the next page.
     * @returns {Promise<void>}
     */
    nextPage(): Promise<void> {
        return this.rendition.next();
    };

    /**
     * Navigates to target position (Cfi, percentage, or href are accepted).
     * @param {string} destination
     * @returns {Promise<void>}
     */
    goto(destination: string): Promise<void> {
        return this.rendition.display(destination);
    }

    /**
     * Sets the theme.
     * @param {object} themeData The theme JSON data.
     */
    setThemeData(themeData: object): void {
        this.rendition.themes.default(themeData);
    };

    /**
     * Search in the whole book.
     * @param {string} q The query string.
     * @returns {Promise<any>}
     */
    searchInWholeBook(q: string): Promise<any> {
        const promiseList: Array<Promise<any>> = [];
        this.book.spine.each((item: any) => {
            promiseList.push(item.load(this.book.load.bind(this.book))
                .then(item.find.bind(item, q))
                .finally(item.unload.bind(item)));
        });
        return Promise.all(promiseList).then((resultList) => {
            const result = [].concat.apply([], resultList);
            this.sendToApp('setState', {
                searchResultList: result,
            });
            return Promise.resolve(result);
        });
    }

    /**
     * Search in the current chapter.
     * @param {string} q The query string.
     */
    searchInCurrentChapter(q: string): void {
        const item = this.book.section(this.rendition.location.start.cfi);
        this.sendToApp('setState', {
            searchResultList: item.find(q),
        });
    }

    /**
     * Set the JavaScript Channel.
     */
    setAppApi() {
        this.appApi = window.appApi ?? {};
    }

    /**
     * Sends the data to the server.
     * @param {string} route The route to send the data to.
     * @param {any} data The data to send.
     * @private
     */
    private sendToApp(route: string, data: any = ""): void {
        if (this.appApi) {
            this.appApi.postMessage(JSON.stringify({
                route: route,
                data: data,
            }));
        } else {
            console.log(route, data);
        }
    }

    /**
     * Get the breadcrumb by DFS.
     * @param {Array} chapterList The chapter list.
     * @param {String} href The chapter href.
     */
    private getBreadcrumb(chapterList: Array<any>, href: string): string {
        return this.getBreadcrumbHelper(chapterList, href);
    }

    private getBreadcrumbHelper(chapterList: Array<any>, href: string, breadcrumb: Array<any> = [], level: number = 0): string {
        for (let i = 0; i < chapterList.length; i++) {
            breadcrumb[level] = chapterList[i].label.trim();

            if (chapterList[i].href === href) {
                return breadcrumb.join(' > ');
            }

            const result = this.getBreadcrumbHelper(chapterList[i].subitems, href, breadcrumb, level + 1);
            if (!!result) {
                return result;
            }
        }
        return null;
    }

    /**
     * Initialize the debugging.
     */
    initDebug(): void {
        // Key event listeners.
        window.addEventListener('keyup', this.keyEventHandler.bind(this));
        this.rendition.on('keyup', this.keyEventHandler.bind(this));
    }

    /**
     * Key up event handler.
     */
    private keyEventHandler(e: KeyboardEvent): void {
        switch (e.code) {
            case 'ArrowLeft':
                this.isRtl ? this.nextPage() : this.prevPage();
                break;

            case 'ArrowRight':
                this.isRtl ? this.prevPage() : this.nextPage();
                break;
        }
    }

    static getInstance(): ReaderApi {
        window.readerApi ??= new ReaderApi();
        return window.readerApi;
    }
}