export class CommunicationService {
    private channel: any = null;
    private keyMap: Map<string, Function> = new Map();

    setChannel (channel: any) {
        this.channel = channel;
    }

    send(route: string, data: any = ""): void {
        if (this.channel) {
            this.channel.postMessage(JSON.stringify({
                route: route,
                data: data,
            }));
        } else {
            console.log(route, data);
        }
    }

    receive(route: string, data: string = "{}"): void {
        if (this.keyMap.has(route)) {
            this.keyMap.get(route)(data);
        }
    }

    register(route: string, callback: Function): void {
        this.keyMap.set(route, callback);
    }

    static getInstance(): CommunicationService {
        window.communicationService ??= new CommunicationService();
        return window.communicationService;
    }

    static send(route: string, data: any = ""): void {
        CommunicationService.getInstance().send(route, data);
    }

    static register(route: string, callback: Function): void {
        CommunicationService.getInstance().register(route, callback);
    }
}