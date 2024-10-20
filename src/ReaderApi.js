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
                const isRtl = this._isRtl = this.book.packaging.metadata.direction === 'rtl';
                this._sendToApp('setState', {
                    atStart: location.atStart ?? false,
                    atEnd: location.atEnd ?? false,
                    startCfi: location.start.cfi,
                    href: location.start.href,
                    isRtl: isRtl,
                    localCurrent: location.start.displayed.page,
                    localTotal: location.start.displayed.total,
                });
            });

            return this.goto(destination);
        }).then(() => {
            this._sendToApp('loadDone');

            this.setThemeData({
                "html, body": {
                    "touch-action": "none",
                },
            });

            // Key event listeners.
            window.addEventListener('keyup', this._keyEventHandler.bind(this));
            this.rendition.on('keyup', this._keyEventHandler.bind(this));
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

    /**
     * Search in the whole book.
     * @param {string} q The query string.
     * @returns {Promise}
     */
    searchInWholeBook(q) {
        return Promise.all(
            this.book.spine.spineItems.map((item) => {
                return item.load(this.book.load.bind(this.book))
                    .then(item.find.bind(item, q))
                    .finally(item.unload.bind(item));
            })
        ).then((resultList) => {
            const result = [].concat.apply([], resultList);
            this._sendToApp('setState', {
                searchResultList: result,
            });
            return Promise.resolve(result);
        });
    }

    /**
     * Search in the current chapter.
     * @param {string} q The query string.
     * @returns {Promise}
     */
    searchInCurrentChapter(q) {
        const item = this.book.spine.get(this.rendition.location.start.cfi);
        return item.load(this.book.load.bind(this.book))
            .then(item.find.bind(item, q))
            .finally(item.unload.bind(item))
            .then((resultList) => {
                const result = [].concat.apply([], resultList);
                this._sendToApp('setState', {
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
     * @private
     */
    _sendToApp(route, data = {}) {
        if (this._appApi) {
            this._appApi.postMessage(JSON.stringify({
                route: route,
                data: data,
            }));
        }
    }

    /**
     * Key up event handler.
     * @param {KeyboardEvent} e The keyboard event.
     * @private
     */
    _keyEventHandler(e) {
        e.preventDefault();
        switch (e.code) {
            case 'ArrowLeft':
                this._isRtl ? this.nextPage() : this.prevPage();
                break;

            case 'ArrowRight':
                this._isRtl ? this.prevPage() : this.nextPage();
                break;
        }
    }
}