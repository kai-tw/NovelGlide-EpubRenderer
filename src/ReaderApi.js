import Epub from 'epubjs';

export class ReaderApi {
    constructor() {
        this.book = Epub("book.epub");
        this.rendition = this.book.renderTo("app", {
            method: "default",
            width: "100vw",
            height: "100vh",
        });
    }

    main(cfi) {
        this.book.ready.then(() => {
            /**
             * Sends the location information to the server after the page is relocated.
             */
            this.rendition.on('relocated', (location) => {
                this.sendToServer('/setState', JSON.stringify({
                    atStart: location.atStart ?? false,
                    atEnd: location.atEnd ?? false,
                    startCfi: location.start.cfi,
                    endCfi: location.end.cfi,
                    localCurrent: location.start.displayed.page,
                    localTotal: location.start.displayed.total,
                }));
            });

            return this.goToCfi(cfi);
        }).then(() => {
            this.sendToServer('/loadDone');
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
     * Navigates to the given CFI.
     * @param {string} cfi The CFI to navigate to.
     * @returns {Promise<void>}
     */
    goToCfi(cfi) {
        return this.rendition.display(cfi);
    }

    /**
     * Sets the theme.
     * @param {object} themeData The theme JSON data.
     */
    setThemeData(themeData) {
        this.rendition.themes.default(themeData);
    };

    /**
     * Sends the data to the server.
     * @param {string} url The url to send the data to.
     * @param {string} data The data to send.
     */
    sendToServer(url, data = '') {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        xhr.send(data);
    }
}