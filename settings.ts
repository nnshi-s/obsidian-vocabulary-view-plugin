import {App, Plugin, PluginSettingTab, Setting, FileSystemAdapter} from 'obsidian';
import VocabularyView from "./main";

export interface VocabularyViewSettings {
    numOfVocabularyBooks: number;
    vocabularyBookPaths: string[];
}

export const DEFAULT_SETTINGS: Partial<VocabularyViewSettings> = {
    numOfVocabularyBooks: 1,
    vocabularyBookPaths: [""],
}

export enum VocabularyBookPathStatus {
    INVALID,
    DOES_NOT_EXIST,
    EXISTS,
}

export class VocabularyViewSettingTab extends PluginSettingTab {
    plugin: VocabularyView;

    defaultDescription: string = `The path of the vocabulary book, choose an empty .md file or create a new one to be used as the vocabulary book.
        You can either manually enter the relative path to the file,
        or right-click on the file in Obsidian, select 'Copy Obsidian URL', and paste it here.`;

    defaultSettingName: string = "Book";

    settingsChangedCallback: () => Promise<void>;
    // vocabularyBookAddedCallback: (path: string) => Promise<void>;
    // vocabularyBookRemovedCallback: (path: string) => Promise<void>;

    constructor(app: App, plugin: VocabularyView) {
        super(app, plugin);
        this.plugin = plugin;
    }

    onSettingsChanged(callback: () => Promise<void>): void {
        this.settingsChangedCallback = callback;
    }

    // onVocabularyBookAdded(callback: (path: string) => Promise<void>): void {
    //     this.vocabularyBookAddedCallback = callback;
    // }
    //
    // onVocabularyBookRemoved(callback: (path: string) => Promise<void>): void {
    //     this.vocabularyBookRemovedCallback = callback;
    // }

    display(): void {
        let {containerEl} = this;
        containerEl.empty();
        // containerEl.createEl("h2", {text: "Settings for Vocabulary View"});

        // create setting for the number of vocabulary books
        new Setting(containerEl)
            .setName("Number of Vocabulary Books")
            .setDesc("The number of vocabulary books to be used.")
            .addText(text => text
                .setPlaceholder("1")
                .setValue(this.plugin.settings.numOfVocabularyBooks.toString())
                .onChange(async (value) => {
                    let num = parseInt(value);
                    if (isNaN(num)) {
                        num = 1;
                    }
                    this.plugin.settings.numOfVocabularyBooks = num;
                    this.display();
                    await this.plugin.saveSettings();
                }));

        // create setting for the vocabulary book path
        for (let i = 0; i < this.plugin.settings.numOfVocabularyBooks; i++) {
            this.createSetting(containerEl, i);
        }

        this.settingsChangedCallback();
    }


    createSetting(containerEl: HTMLElement, i: number): void {
        let temporarilyDisableOnChange = false;
        let settingName = this.defaultSettingName + " " + (i + 1);


        let st = new Setting(containerEl)
            .setName(settingName + " (" + this.plugin.settings.vocabularyBookPaths[i] + ")")
            .setDesc(this.defaultDescription)
            .addText(text => text
                .setPlaceholder("relative path or obsidian url")
                .setValue(this.plugin.settings.vocabularyBookPaths[i])
                .onChange(async (value) => {
                    if (temporarilyDisableOnChange) {
                        return;
                    }
                    this.plugin.settings.vocabularyBookPaths[i] = "";

                    if (value === "") {
                        st.setName(this.defaultSettingName);
                    } else {
                        const fs = this.app.vault.adapter as FileSystemAdapter;
                        let formattedPath = VocabularyViewSettingTab.formatPath(value);
                        let fileStatus = await VocabularyViewSettingTab.checkPath(formattedPath, fs);

                        if (fileStatus === VocabularyBookPathStatus.INVALID) {
                            st.setName(settingName + " (Invalid Path)");
                        } else if (fileStatus === VocabularyBookPathStatus.DOES_NOT_EXIST) {
                            st.setName(settingName + " (File Does Not Exist)");
                        } else {
                            st.setName(settingName + " (" + formattedPath + ")");
                            temporarilyDisableOnChange = true;
                            this.plugin.settings.vocabularyBookPaths[i] = formattedPath;
                            // text.setValue(this.plugin.settings.vocabularyBookPath);
                            // await this.vocabularyBookAddedCallback(formattedPath);
                            temporarilyDisableOnChange = false;
                        }
                    }
                    await this.settingsChangedCallback();
                    await this.plugin.saveSettings();
                }));


    }

    /**
     * Check if the input path is a relative path ending with .md.
     * @param input
     */
    static isRelativePath(input: string): boolean {
        // regular expression for relative paths
        const relativePathRegex = /^[^:*?"<>|\r\n]+(\.[^:*?"<>|\r\n]+)*\.md$/;
        return relativePathRegex.test(input);
    }

    static isObsidianLink(input: string): boolean {
        // regular expression for Obsidian links
        const obsidianLinkRegex = /^obsidian:\/\/open\?vault=[^&]+&file=([^&]+)$/;
        return obsidianLinkRegex.test(input);
    }

    static convertObsidianLinkToRelativePath(input: string): string {
        // regular expression for Obsidian links
        const obsidianLinkRegex = /^obsidian:\/\/open\?vault=[^&]+&file=([^&]+)$/;

        // Check if the input string is an Obsidian link
        const obsidianMatch = input.match(obsidianLinkRegex);
        if (obsidianMatch) {
            // Decode the Obsidian link and replace '%2F' with '/'
            const filePath = decodeURIComponent(obsidianMatch[1]).replace(/%2F/g, '/');
            return filePath; // Return the converted relative path
        }

        // If it doesn't match the Obsidian link format, return an empty string
        return '';
    }

    /**
     * Format the input path to a relative path with the .md extension.
     * @param path
     */
    static formatPath(path: string): string {
        if (path === "") {
            return "";
        }

        let formattedPath: string = path;
        if (VocabularyViewSettingTab.isObsidianLink(path)) {
            formattedPath = VocabularyViewSettingTab.convertObsidianLinkToRelativePath(path);
        }
        // add .md extension if it doesn't exist
        if (!formattedPath.endsWith(".md")) {
            formattedPath += ".md";
        }
        if (!VocabularyViewSettingTab.isRelativePath(formattedPath)) {
            return "";
        }
        return formattedPath;
    }

    /**
     * Check the input path, and return the description string.
     * @param path
     * @param fs
     */
    static async checkPath(path: string, fs: FileSystemAdapter): Promise<VocabularyBookPathStatus> {
        if (VocabularyViewSettingTab.isRelativePath(path)) {
            // const fs = this.app.vault.adapter as FileSystemAdapter;
            let fileExists = await fs.exists(path);
            if (fileExists) {
                return VocabularyBookPathStatus.EXISTS;
            } else {
                return VocabularyBookPathStatus.DOES_NOT_EXIST;
            }
        } else {
            return VocabularyBookPathStatus.INVALID;
        }
    }
}