export class BreadcrumbUtils {
    /**
     * Get the breadcrumb by DFS.
     * @param {Array} chapterList The chapter list.
     * @param {String} href The chapter href.
     */
    static get(chapterList: Array<any>, href: string): string {
        return BreadcrumbUtils.helper(chapterList, href);
    }

    static helper(chapterList: Array<any>, href: string, breadcrumb: Array<any> = [], level: number = 0): string {
        for (let i = 0; i < chapterList.length; i++) {
            breadcrumb[level] = chapterList[i].label.trim();

            if (chapterList[i].href === href) {
                return breadcrumb.join(' > ');
            }

            const result = BreadcrumbUtils.helper(chapterList[i].subitems, href, breadcrumb, level + 1);
            if (!!result) {
                return result;
            }
        }
        return null;
    }
}