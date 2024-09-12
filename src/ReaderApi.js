import Epub from 'epubjs';

export class ReaderApi {
    constructor() {
        this.book = Epub("book.epub");
        this.rendition = this.book.renderTo("app", {
            width: "100vw",
            height: "100vh",
        });
    }

    /**
     * The entry point of the reader.
     * @param destination
     */
    main(destination) {
        this.book.ready.then(() => {
            let promises = [];
            this.book.spine.each((section) => {
                promises.push(this.book.locations.process(section));
            });
            return Promise.all(promises);
        }).then(() => {
            /**
             * Sends the location information to the server after the page is relocated.
             */
            this.rendition.on('relocated', (location) => {
                this.sendToApp('setState', {
                    atStart: location.atStart ?? false,
                    atEnd: location.atEnd ?? false,
                    startCfi: location.start.cfi,
                    href: location.start.href,
                    isRtl: this.book.packaging.metadata.direction === 'rtl',
                    localCurrent: location.start.displayed.page,
                    localTotal: location.start.displayed.total,
                });
            });

            return this.goto(destination);
        }).then(() => {
            this.sendToApp('loadDone');
        });
    }

    /**
     * Navigates to the previous page.
     * @returns {Promise<void>}
     */
    prevPage() {
        return this.rendition.prev();
    };

    /**
     * Navigates to the next page.
     * @returns {Promise<void>}
     */
    nextPage() {
        return this.rendition.next();
    };

    /**
     * Navigates to target position (Cfi, percentage, or href are accepted).
     * @param {*} destination
     * @returns {Promise<void>}
     */
    goto(destination) {
        return this.rendition.display(destination);
    }

    /**
     * Sets the theme.
     * @param {object} themeData The theme JSON data.
     */
    setThemeData(themeData) {
        this.rendition.themes.default(themeData);
    };

    search(q) {
        return Promise.all(
            this.book.spine.spineItems.map((item) => {
                return item.load(this.book.load.bind(this.book))
                    .then(item.find.bind(item, q))
                    .finally(item.unload.bind(item));
            })
        ).then((resultList) => {
            const result = [].concat.apply([], resultList);
            this.sendToApp('setState', {
                searchResultList: result,
            });
            return Promise.resolve(result);
        });
    }

    searchInCurrentChapter(q) {
        const item = this.book.spine.get(this.rendition.location.start.cfi);
        return item.load(this.book.load.bind(this.book))
            .then(item.find.bind(item, q))
            .finally(item.unload.bind(item))
            .then((resultList) => {
                const result = [].concat.apply([], resultList);
                this.sendToApp('setState', {
                    searchResultList: result,
                });
                return Promise.resolve(result);
            });
    }

    /**
     * Set the JavaScript Channel.
     */
    setAppApi() {
        this._appApi = window.appApi ?? {};
    }

    /**
     * Sends the data to the server.
     * @param {string} route The route to send the data to.
     * @param {string} data The data to send.
     */
    sendToApp(route, data = {}) {
        if (this._appApi) {
            this._appApi.postMessage(JSON.stringify({
                route: route,
                data: data,
            }));
        }
    }
}