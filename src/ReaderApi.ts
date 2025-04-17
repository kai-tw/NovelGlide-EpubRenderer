import Epub, {Book, Rendition} from 'epubjs';
import Section from "epubjs/types/section";
import {BreadcrumbUtils} from "./utils/BreadcrumbUtils";
import {TextNodeUtils} from "./utils/TextNodeUtils";
import {CommunicationService} from "./services/CommunicationService";
import {DelayTimeUtils} from "./utils/DelayTimeUtils";
import "@af-utils/scrollend-polyfill";

export class ReaderApi {
    public book: Book;
    public rendition: Rendition;
    public isAtEnd: boolean = false;
    private isSmoothScroll: boolean = false;
    private isScrolling: boolean = false;
    private isRtl: Boolean = false;

    private fontColor: string = 'unset';
    private fontSize: number = 16;
    private lineHeight: number = 1.5;

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
        CommunicationService.register('setFontColor', this.setFontColor.bind(this));
        CommunicationService.register('setFontSize', this.setFontSize.bind(this));
        CommunicationService.register('setLineHeight', this.setLineHeight.bind(this));
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

        // Event listeners
        this.rendition.on('orientationchange', this.onOrientationChange.bind(this));
        this.rendition.on('relocated', this.syncState.bind(this));

        await this.goto(destination);

        this.applyCssChanges();

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

    private syncState(location: any) {
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

        // Disable the smooth scroll if it is going to the previous chapter.
        if (doGotoPrevChapter) {
            this.setSmoothScroll(false);
        }

        this.isScrolling = true;
        this.rendition.prev();

        // Wait for the scroll end event.
        await new Promise<void>((resolve, reject) => {
            if (!isSmoothScroll || doGotoPrevChapter) {
                // Smooth scroll is disabled, or it is going to the previous chapter.
                this.rendition.once('relocated', () => resolve());
            } else {
                // Smooth scroll is enabled.
                const scrollEndFunc = async () => {
                    this.container.removeEventListener("scrollend", scrollEndFunc);

                    // De-bounce
                    await DelayTimeUtils.delay(300);
                    resolve();
                };
                this.container.addEventListener("scrollend", scrollEndFunc);
            }
        });

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

        this.isScrolling = true;
        this.rendition.next();

        await new Promise<void>(async (resolve, reject) => {
            if (doGotoNextChapter) {
                // Disable the smooth scroll if it is going to the next chapter.
                this.rendition.once('relocated', () => resolve());
            } else {
                // Smooth scroll is enabled.
                const scrollEndFunc = async () => {
                    this.container.removeEventListener("scrollend", scrollEndFunc);

                    // De-bounce
                    await DelayTimeUtils.delay(300);
                    resolve();
                };
                this.container.addEventListener("scrollend", scrollEndFunc);
            }
        });

        this.isScrolling = false;
    }

    /**
     * Navigates to target position (Cfi, percentage, or href are accepted).
     * @param {string} destination
     * @returns {Promise<void>}
     */
    async goto(destination: string): Promise<void> {
        await this.rendition.display(destination);
    }

    /**
     * Set the font color.
     */
    setFontColor(color: string): void {
        if (color !== this.fontColor) {
            this.fontColor = color;
            this.applyCssChanges();
        }
    }

    /**
     * Set the font size.
     */
    setFontSize(fontSize: number): void {
        if (fontSize !== this.fontSize) {
            this.fontSize = fontSize;
            this.rendition.themes.fontSize(`${fontSize}px`);
        }
    }

    /**
     * Set the line height.
     */
    setLineHeight(lineHeight: number): void {
        if (lineHeight !== this.lineHeight) {
            this.lineHeight = lineHeight;
            this.applyCssChanges();
        }
    }

    /**
     * Set the default theme.
     */
    private applyCssChanges(): void {
        // Check if background color is set.
        const backgroundColor: string = getComputedStyle(this.viewBodyElement).backgroundColor;
        const isTransparent: boolean = backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent';
        this.rendition.themes.default({
            'body': {
                'color': isTransparent ? this.fontColor : 'inherit',
                'line-height': `${this.lineHeight}`,
            },
            'a': {
                'color': 'inherit',
            },
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