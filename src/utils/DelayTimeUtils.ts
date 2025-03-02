export class DelayTimeUtils {
    static async delay(milliseconds: number): Promise<void> {
        return new Promise<void>((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }
}