import {ReaderApi} from "../ReaderApi";
import {TextNodeUtils} from "../utils/TextNodeUtils";
import {CommunicationService} from "./CommunicationService";

export class TtsService {
    private nodeList: Array<Node> = [];
    private previousPlayedNode: Node | null = null;
    private get readerApi(): ReaderApi {
        return ReaderApi.getInstance();
    }

    constructor() {
        CommunicationService.register('ttsPlay', this.play.bind(this));
        CommunicationService.register('ttsNext', this.next.bind(this));
        CommunicationService.register('ttsStop', this.stop.bind(this));
    }

    send(): void {
        if (this.nodeList[0]) {
            const text = this.nodeList[0].textContent.trim();
            CommunicationService.send('ttsPlay', text);
        }
    }

    play(): void {
        this.nodeList = this.readerApi.textNodeList
            .filter((node) => {
                const hasContent = node.textContent.trim().length > 0;
                return TextNodeUtils.isVisible(node) && hasContent;
            });
        this.send();
    }

    async next(): Promise<void> {
        this.previousPlayedNode = this.nodeList.shift();

        if (this.nodeList.length === 0) {
            // The last paragraph is being played.
            if (this.readerApi.isAtEnd) {
                CommunicationService.send('ttsEnd');
                return;
            }

            // Flipping the page.
            await this.readerApi.nextPage();

            this.nodeList = this.readerApi.textNodeList
                .filter((node) => {
                    const nodeText = node.textContent.trim();
                    const previousNodeText = this.previousPlayedNode?.textContent.trim();
                    return TextNodeUtils.isVisible(node) && nodeText !== previousNodeText;
                });
        }
        this.send();
    }

    stop(): void {
        this.nodeList = [];
        this.previousPlayedNode = null;
    }

    static getInstance(): TtsService {
        window.ttsService ??= new TtsService();
        return window.ttsService
    }
}