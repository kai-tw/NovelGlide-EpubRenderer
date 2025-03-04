import Epub, {Book, Rendition} from 'epubjs';
import Section from "epubjs/types/section";
import {BreadcrumbUtils} from "./utils/BreadcrumbUtils";
import {TextNodeUtils} from "./utils/TextNodeUtils";
import {CommunicationService} from "./services/CommunicationService";
import {DelayTimeUtils} from "./utils/DelayTimeUtils";
import "@af-utils/scrollend-polyfill";

export class ReaderApi {
    private book: Book;
    public rendition: Rendition;
    public isAtEnd: boolean = false;
    private isSmoothScroll: boolean = false;
    private isScrolling: boolean = false;
    private isRtl: Boolean = false;

    constructor() {
        this.book = Epub("book.epub");
        this.rendition = this.book.renderTo("app", {
            width: window.innerWidth,
            height: window.innerHeight,
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
    async main(data: { destination?: any; savedLocation?: any } = {}): Promise<void> {
        const destination: string | undefined = data.destination === null ? undefined : data.destination;
        const savedLocation: string | undefined = data.savedLocation;

        await this.book.ready;

        // Load the saved locations.
        if (!!savedLocation) {
            this.book.locations.load(savedLocation as string);
        } else {
            // Generate the locations
            let promises: Promise<any>[] = [];
            this.book.spine.each((section: Section) => {
                promises.push(this.book.locations.process(section));
            });
            await Promise.all(promises);

            // Send the list of locations.
            CommunicationService.send('saveLocation', this.book.locations.save());
        }

        this.rendition.on("orientationchange", this.onOrientationChange.bind(this));

        await this.goto(destination);
        CommunicationService.send('loadDone');
    }

    private async onOrientationChange(): Promise<void> {
        this.rendition.resize(window.innerWidth, window.innerHeight);
        const isSmoothScroll = this.isSmoothScroll;
        this.setSmoothScroll(false);
        this.rendition.once("relocated", () => {
            this.setSmoothScroll(isSmoothScroll);
        });
    }

    private syncState() {
        const location = this.rendition.location;

        this.isRtl = this.rendition.settings.defaultDirection === 'rtl';
        this.isAtEnd = location.atEnd ?? false;

        const breadcrumb: string = BreadcrumbUtils.get(this.book.navigation.toc, location.start.href);
        const avgPercentage: number = (location.start.percentage + location.end.percentage) / 2;
        const startCfi: string = this.book.locations.cfiFromPercentage(avgPercentage);
        CommunicationService.send('setState', {
            startCfi: startCfi,
            breadcrumb: breadcrumb,
            chapterFileName: location.start.href,
            chapterCurrentPage: this.currentPage,
            chapterTotalPage: this.totalPage,
        });
        CommunicationService.send('log', JSON.stringify({
            startCfi: startCfi,
            breadcrumb: breadcrumb,
            chapterFileName: location.start.href,
            chapterCurrentPage: this.currentPage,
            chapterTotalPage: this.totalPage,
        }));
    }

    /**
     * Navigates to the previous page.
     * @returns {Promise<void>}
     */
    async prevPage(): Promise<void> {
        if (this.isRtl) {
            await this.gotoNextPage();
        } else {
            await this.gotoPrevPage();
        }
    };

    private async gotoPrevPage(): Promise<void> {
        if (this.isScrolling) {
            return;
        }

        const doGotoPrevChapter: boolean = this.currentPage === 1;
        const isSmoothScroll: boolean = this.isSmoothScroll;

        // Disable the smooth scroll if it is going to the next chapter.
        if (doGotoPrevChapter) {
            this.setSmoothScroll(false);
        }

        let resolver: () => void;
        const scrollEndFunc = () => {
            this.container.removeEventListener("scrollend", scrollEndFunc);
            resolver?.call(this);
        };

        if (!isSmoothScroll || doGotoPrevChapter) {
            this.rendition.once('relocated', scrollEndFunc.bind(this));
        } else {
            this.container.addEventListener("scrollend", scrollEndFunc);
        }

        this.isScrolling = true;
        await new Promise<void>(async (resolve, reject) => {
            resolver = resolve;
            await this.rendition.prev();
        });

        this.syncState();

        if (isSmoothScroll) {
            // De-bounce
            await DelayTimeUtils.delay(300);
        }

        // Restore the smooth scroll setting.
        this.setSmoothScroll(isSmoothScroll);
        this.isScrolling = false;
    }

    /**
     * Navigates to the next page.
     * @returns {Promise<void>}
     */
    async nextPage(): Promise<void> {
        if (this.isRtl) {
            await this.gotoPrevPage();
        } else {
            await this.gotoNextPage();
        }
    };

    private async gotoNextPage(): Promise<void> {
        if (this.isScrolling) {
            return;
        }

        const lastPage: number = this.totalPage - (this.isSinglePage ? 0 : 1);
        const doGotoNextChapter: boolean = this.currentPage === lastPage;

        let resolver: () => void;
        const scrollEndFunc = () => {
            this.container.removeEventListener("scrollend", scrollEndFunc);
            resolver?.call(this);
        };

        if (doGotoNextChapter) {
            this.rendition.once('relocated', scrollEndFunc.bind(this));
        } else {
            this.container.addEventListener("scrollend", scrollEndFunc);
        }

        this.isScrolling = true;

        await new Promise<void>(async (resolve, reject) => {
            resolver = resolve;
            await this.rendition.next();
        });

        this.syncState();

        if (this.isSmoothScroll) {
            // De-bounce
            await DelayTimeUtils.delay(300);
        }

        this.isScrolling = false;
    }

    /**
     * Navigates to target position (Cfi, percentage, or href are accepted).
     * @param {string} destination
     * @returns {Promise<void>}
     */
    async goto(destination: string): Promise<void> {
        this.rendition.once('relocated', this.syncState.bind(this));
        await this.rendition.display(destination);
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
        this.isSmoothScroll = enable;
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

    private get viewDocument(): Document {
        const contentList: any = this.rendition.getContents();
        return contentList[0].document;
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