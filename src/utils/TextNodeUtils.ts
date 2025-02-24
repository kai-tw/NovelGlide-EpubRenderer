import {ReaderApi} from "../ReaderApi";

export class TextNodeUtils {
    static getList(root: Node): Array<Node> {
        let children: Node[] = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while(walker.nextNode()) {
            children.push(walker.currentNode)
        }
        return children;
    }

    static getBoundingClientRect(textNode: Node) {
        const range = document.createRange();
        range.selectNode(textNode);
        const rect = range.getBoundingClientRect();
        range.detach();
        return rect;
    }

    static isCrossPage(textNode: Node): boolean {
        const readerApi = ReaderApi.getInstance();
        const textRect = TextNodeUtils.getBoundingClientRect(textNode);
        return textRect.width > readerApi.pageWidth;
    }

    static isVisible(textNode: Node): boolean {
        const readerApi = ReaderApi.getInstance();
        const screenLeft = readerApi.scrollLeft;
        const screenRight = screenLeft + readerApi.screenWidth;
        const textRect = TextNodeUtils.getBoundingClientRect(textNode);
        const textLeft = textRect.x;
        const textRight = textLeft + textRect.width;

        if (this.isCrossPage) {
            return screenLeft <= textLeft && textLeft <= screenRight ||
                screenLeft <= textRight && textRight <= screenRight;
        } else {
            return screenLeft <= textLeft && textRight <= screenRight;
        }
    }
}