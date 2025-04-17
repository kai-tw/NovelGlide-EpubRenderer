import {CommunicationService} from "./CommunicationService";
import {ReaderApi} from "../ReaderApi";

export class SearchService {
    constructor() {
        // Register the communication methods
        CommunicationService.register('searchInWholeBook', this.searchInWholeBook.bind(this));
        CommunicationService.register('searchInCurrentChapter', this.searchInCurrentChapter.bind(this));
    }

    /**
     * Search in the whole book.
     * @param {string} q The query string.
     * @returns {Promise<any>}
     */
    searchInWholeBook(q: string): void {
        const book = ReaderApi.getInstance().book;
        const promiseList: Array<Promise<any>> = [];
        book.spine.each((item: any) => {
            promiseList.push(item.load(book.load.bind(book))
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
        const book = ReaderApi.getInstance().book;
        const rendition = ReaderApi.getInstance().rendition;
        const item = book.section(rendition.location.start.cfi);
        CommunicationService.send('setSearchResultList', {
            searchResultList: item.find(q),
        });
    }

    static getInstance(): SearchService {
        window.searchService ??= new SearchService();
        return window.searchService;
    }
}