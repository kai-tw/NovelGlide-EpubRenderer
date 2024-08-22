import '@src/sass/main.sass';
import Epub from 'epubjs';

const book = Epub("book.epub");
const rendition = book.renderTo("app", {
    method: "default",
    width: "100vw",
    height: "100vh",
});

/**
 * Sends the location information to the server after the page is relocated.
 */
rendition.on('relocated', (location) => {
    window.sendToServer('/setState', JSON.stringify({
        atStart: location.atStart ?? false,
        atEnd: location.atEnd ?? false,
        startCfi: location.start.cfi,
        endCfi: location.end.cfi,
        localCurrent: location.start.displayed.page,
        localTotal: location.start.displayed.total,
    }));
});

/**
 * Sends a message to the server that the book has loaded.
 */
rendition.display().then(() => window.sendToServer('/loadDone'));

/**
 * Navigates to the previous page.
 */
window.prevPage = function () {
    rendition.prev().then();
};

/**
 * Navigates to the next page.
 */
window.nextPage = function () {
    rendition.next().then();
};

/**
 * Navigates to the given CFI.
 * @param {string} cfi The CFI to navigate to.
 */
window.goToCfi = function (cfi) {
    rendition.display(cfi).then();
}

/**
 * Sets the theme.
 * @param {object} themeData The theme JSON data.
 */
window.setThemeData = function (themeData) {
    rendition.themes.default(themeData);
};

/**
 * Sends the data to the server.
 * @param {string} url The url to send the data to.
 * @param {string} data The data to send.
 */
window.sendToServer = function (url, data = '') {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    xhr.send(data);
};
