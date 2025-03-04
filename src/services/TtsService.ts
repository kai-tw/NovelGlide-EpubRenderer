import {ReaderApi} from "../ReaderApi";
import {TextNodeUtils} from "../utils/TextNodeUtils";
import {CommunicationService} from "./CommunicationService";

export class TtsService {
    private nodeList: Array<Node> = [];
    private previousPlayedNode: Node | null = null;
    private isPlaying: boolean = false;

    constructor() {
        CommunicationService.register('ttsPlay', this.play.bind(this));
        CommunicationService.register('ttsNext', this.next.bind(this));
        CommunicationService.register('ttsStop', this.stop.bind(this));

        ReaderApi.getInstance()
            .rendition.on("orientationchange", this.onOrientationChange.bind(this));
    }

    send(): void {
        if (this.nodeList[0]) {
            const text = this.nodeList[0].textContent.trim();
            CommunicationService.send('ttsPlay', text);
        }
    }

    play(): void {
        this.nodeList = ReaderApi.getInstance().textNodeList
            .filter((node) => {
                const hasContent = node.textContent.trim().length > 0;
                return TextNodeUtils.isVisible(node) && hasContent;
            });
        if (this.nodeList.length > 0) {
            this.isPlaying = true;
            this.send();
        }
    }

    async next(): Promise<void> {
        this.previousPlayedNode = this.nodeList.shift();

        if (this.nodeList.length === 0) {
            // The last paragraph is being played.
            if (ReaderApi.getInstance().isAtEnd) {
                this.stop();
                CommunicationService.send('ttsEnd');
                return;
            }

            // Flipping the page.
            await ReaderApi.getInstance().nextPage();

            this.nodeList = ReaderApi.getInstance().textNodeList
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
        this.isPlaying = false;
    }

    private onOrientationChange(): void {
        if (this.isPlaying) {
            ReaderApi.getInstance().rendition.once("relocated", () => {
                this.play();
            });
            this.stop();
            CommunicationService.send('ttsStop');
        }
    }

    static getInstance(): TtsService {
        window.ttsService ??= new TtsService();
        return window.ttsService
    }
}