import {Words, Word} from "./words";
import {App, FileSystemAdapter} from "obsidian";

export class VocabularyBook {
    // private static instance: VocabularyBook;

    private vocabularyBookPath: string;
    private vocabularyBookName: string;
    private cache: Map<string, Word>;
    private app: App;

    public constructor(app: App, path: string) {
        this.vocabularyBookPath = path;
        this.vocabularyBookName = extractNameFromPath(path);
        this.cache = new Map<string, Word>();
        this.app = app;
    }

    // public static getInstance(path: string): VocabularyBook {
    //     if (!VocabularyBook.instance) {
    //         VocabularyBook.instance = new VocabularyBook(path);
    //     }
    //     VocabularyBook.instance.vocabularyBookPath = path;
    //     return VocabularyBook.instance;
    // }

    public async addWord(word: Word): Promise<void> {
        this.cache.set(word.word, word);
        await this.saveWordsFromCacheToDisk();
    }

    public async removeWord(word: Word): Promise<void> {
        this.cache.delete(word.word);
        await this.saveWordsFromCacheToDisk();
    }

    public hasWord(word: string): boolean {
        return this.cache.has(word);
    }

    public async loadWordsFromDiskToCache(): Promise<void> {
        const fs = this.app.vault.adapter as FileSystemAdapter;
        let rawFileContent = await fs.read(this.vocabularyBookPath);
        // extract the first vocaview block
        const regex = /```vocaview-[\w]+\n([\s\S]*?)\n```/;
        let match = regex.exec(rawFileContent);
        if (match) {
            // remove the first and last line of the vocaview block, keeping only the words and explanations
            let words_and_explanations = match[0].split('\n');
            words_and_explanations.shift();
            words_and_explanations.pop();
            // regroup the remaining lines to a single string
            let words_and_explanations_str = words_and_explanations.join('\n');
            // use the Words class to parse the string
            const words = new Words(words_and_explanations_str, ':');
            // store the words in the cache
            this.cache.clear();
            for (const word of words) {
                this.cache.set(word.word, word);
            }
        }
    }

    public async saveWordsFromCacheToDisk(): Promise<void> {
        const fs = this.app.vault.adapter as FileSystemAdapter;
        let sourceFileContent = await fs.read(this.vocabularyBookPath);

        // extract the first vocaview block
        const regex = /```vocaview-[\w]+\n([\s\S]*?)\n```/;
        let match = regex.exec(sourceFileContent);

        if (match) {
            // generate the new vocaview block content
            let newVocaviewBlockContent = '';
            for (const word of this.cache.values()) {
                newVocaviewBlockContent += `${word.word}: ${word.explanation}\n`;
            }
            // replace the old vocaview block with the new one
            sourceFileContent = sourceFileContent.replace(
                match[0],
                `${match[0].slice(0, match[0].indexOf('\n'))}\n${newVocaviewBlockContent.trim()}\n\`\`\``
            );
        } else {
            // no vocaview block found, create a new one
            let newVocaviewBlockContent = '';
            for (const word of this.cache.values()) {
                newVocaviewBlockContent += `${word.word}: ${word.explanation}\n`;
            }
            sourceFileContent += `\n\`\`\`vocaview-list1\n${newVocaviewBlockContent.trim()}\n\`\`\``;
        }

        // write the modified file content back to the disk
        await fs.write(this.vocabularyBookPath, sourceFileContent);
    }

    public printCache(): void {
        console.log(this.vocabularyBookName + " (" + this.vocabularyBookPath + "):");
        console.log(this.cache);
    }

    public getVocabularyBookName(): string {
        return this.vocabularyBookName;
    }

    public getVocabularyBookPath(): string {
        return this.vocabularyBookPath;
    }

}

export function extractNameFromPath(path: string | undefined): string {
    if (typeof path === 'undefined') {
        return '';
    }
    const pathComponents = path.split('/');
    const lastComponent = pathComponents[pathComponents.length - 1];
    const name = lastComponent.split('.')[0];
    return name;
}