export class Word {
    word: string;
    explanation: string;

    constructor(word: string, explanation: string) {
        this.word = word;
        this.explanation = explanation;
    }
}

export class Words {
    words: Word[] = [];
    length: number = 0;
    getRandomWords: (num: number) => Word[];
    getRandomWord: () => Word;
    [Symbol.iterator] = () => {
        return new WordsIterator(this);
    }

    [index: number]: Word;

    constructor(src: string, separator: string) {
        const lines: string[] = src.split('\n');
        lines.forEach(value => {
            const separatorPos = value.indexOf(separator);
            if (separatorPos === -1 || value.length <= separatorPos + 1)
                return;

            const word = value.slice(0, separatorPos).trim();
            const explanation = value.slice(separatorPos + 1).trim();

            this.words.push(new Word(word, explanation));
            this.length = this.words.length;
        });
        this.getRandomWords = (num: number) => {
            let retArr: Word[] = [];
            let indexArr: number[] = Array.from(Array(this.length).keys());
            shuffle(indexArr);
            for (let i = 0; i < num; ++i) {
                retArr.push(this.words[indexArr[i]]);
            }
            return retArr;
        }
        this.getRandomWord = () => {
            return this.words[Math.floor(Math.random() * this.length)];
        }
    }
}

class WordsIterator {
    wordsArr: Word[];
    nextIndex: number;
    next: () => { value: Word, done: boolean };

    constructor(words: Words) {
        this.wordsArr = words.words;
        this.nextIndex = 0;
        this.next = () => {
            if (this.nextIndex >= this.wordsArr.length)
                return {value: new Word('', ''), done: true};
            return {value: this.wordsArr[this.nextIndex++], done: false};
        }
    }
}

export function shuffle(arr: number[]) {
    for (let i = 0; i < arr.length; ++i) {
        const r = Math.floor(Math.random() * arr.length);
        let temp = arr[i];
        arr[i] = arr[r];
        arr[r] = temp;
    }
}