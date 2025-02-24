import Epub, { Book, Location, Rendition } from 'epubjs';
import Section from "epubjs/types/section";
import {BreadcrumbUtils} from "./utils/BreadcrumbUtils";
import {TextNodeUtils} from "./utils/TextNodeUtils";
import {CommunicationService} from "./services/CommunicationService";

export class ReaderApi {
    private book: Book;
    private rendition: Rendition;
    public isAtEnd: boolean = false;

    constructor() {
        this.book = Epub("book.epub");
        this.rendition = this.book.renderTo("app", {
            width: "100vw",
            height: "100vh",
        });
        CommunicationService.register('main', this.main.bind(this));
        CommunicationService.register('prevPage', this.prevPage.bind(this));
        CommunicationService.register('nextPage', this.nextPage.bind(this));
        CommunicationService.register('goto', this.goto.bind(this));
        CommunicationService.register('setThemeData', this.setThemeData.bind(this));
        CommunicationService.register('searchInWholeBook', this.searchInWholeBook.bind(this));
        CommunicationService.register('searchInCurrentChapter', this.searchInCurrentChapter.bind(this));
        CommunicationService.register('setSmoothScroll', this.setSmoothScroll.bind(this));
    }

    /**
     * The entry point of the reader.
     */
    main(data: {destination?: string; savedLocation?: string} = {}): void {
        const destination: string | undefined = data.destination;
        const savedLocation: string | undefined = data.savedLocation;
        this.book.ready.then(() => {
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
                CommunicationService.send('saveLocation', locationJSON);
            }

            // The "process" method didn't update the "total" property in the "Locations".
            // Load the locations again to make it update the "total" value.
            this.book.locations.load(locationJSON);

            // Send the location information to the server after the page is relocated.
            this.rendition.on('relocated', (location: Location) => {
                const breadcrumb: string = BreadcrumbUtils.get(this.book.navigation.toc, location.start.href);
                const isRtl: boolean = this.rendition.settings.defaultDirection === 'rtl';
                const avgPercentage: number = (location.start.percentage + location.end.percentage) / 2;
                const startCfi: string = this.book.locations.cfiFromPercentage(avgPercentage);
                this.isAtEnd = location.atEnd ?? false;
                CommunicationService.send('setState', {
                    atStart: location.atStart ?? false,
                    atEnd: this.isAtEnd,
                    startCfi: startCfi,
                    breadcrumb: breadcrumb,
                    chapterFileName: location.start.href,
                    isRtl: isRtl,
                    chapterCurrentPage: this.currentPage,
                    chapterTotalPage: this.totalPage,
                });
            });

            return this.goto(destination);
        }).then(() => {
            CommunicationService.send('loadDone');

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
    searchInWholeBook(q: string): void {
        const promiseList: Array<Promise<any>> = [];
        this.book.spine.each((item: any) => {
            promiseList.push(item.load(this.book.load.bind(this.book))
                .then(item.find.bind(item, q))
                .finally(item.unload.bind(item)));
        });
        Promise.all(promiseList).then((resultList) => {
            CommunicationService.send('setSearchResultList', {
                searchResultList: resultList.flat(),
            });
        });
    }

    /**
     * Search in the current chapter.
     * @param {string} q The query string.
     */
    searchInCurrentChapter(q: string): void {
        const item = this.book.section(this.rendition.location.start.cfi);
        CommunicationService.send('setSearchResultList', {
            searchResultList: item.find(q),
        });
    }

    /**
     * Set the smooth scrolling.
     * @param {boolean} enable
     */
    setSmoothScroll(enable: boolean): void {
        this.container.classList.toggle('enable-smooth-scroll', enable);
    }

    private get totalPage(): number {
        return Math.round(this.scrollWidth / this.screenWidth * (this.isSinglePage ? 1 : 2));
    }

    private get currentPage(): number {
        // In some devices, the scrollLeft value is not accurate, so we need to round it to the nearest integer.
        return Math.round(this.scrollLeft / this.screenWidth * (this.isSinglePage ? 1 : 2)) + 1;
    }

    private get isSinglePage(): boolean {
        return this.screenWidth === this.pageWidth;
    }

    private get viewBodyElement(): HTMLBodyElement {
        const contentList: any = this.rendition.getContents();
        return contentList[0].content;
    }

    private get container(): HTMLElement {
        const view: any = this.rendition.views();
        return view.container;
    }

    get scrollLeft(): number {
        return this.container.scrollLeft;
    }

    private get scrollWidth(): number {
        return this.container.scrollWidth;
    }

    get screenWidth(): number {
        return this.container.clientWidth;
    }

    get pageWidth(): number {
        return parseFloat(this.viewBodyElement.style.columnWidth);
    }

    get textNodeList(): Array<Node> {
        return TextNodeUtils.getList(this.viewBodyElement);
    }

    static getInstance(): ReaderApi {
        window.readerApi ??= new ReaderApi();
        return window.readerApi;
    }
}