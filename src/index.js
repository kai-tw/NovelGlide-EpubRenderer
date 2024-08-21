import '@src/sass/main.sass';
import Epub from 'epubjs';

const book = Epub("book.epub");
const rendition = book.renderTo("app", {
    manager: "default",
    width: "100vw",
    height: "100vh",
});
rendition.display().then();

window.prevPage = function () {
    rendition.prev().then();
};

window.nextPage = function () {
    rendition.next().then();
};