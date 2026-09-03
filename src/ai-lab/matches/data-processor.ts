export interface TickRecord {
    timestamp: number;
    symbol: string;
    price: number;
    digit: number;
    index: number;
}

export class DataProcessor {
    private ticks: TickRecord[] = [];

    addTick(tick: TickRecord) {
        this.ticks.push(tick);

        if (this.ticks.length > 250) {
            this.ticks.shift();
        }
    }

    getWindow(size: number) {
        return this.ticks.slice(-size);
    }

    get20() {
        return this.getWindow(20);
    }

    get50() {
        return this.getWindow(50);
    }

    get100() {
        return this.getWindow(100);
    }

    get250() {
        return this.getWindow(250);
    }
}