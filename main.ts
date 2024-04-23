import {
    App,
    FileSystemAdapter,
    MarkdownPostProcessorContext,
    moment,
    Plugin,
    PluginSettingTab,
    Setting
} from 'obsidian';
import {DEFAULT_SETTINGS, VocabularyBookPathStatus, VocabularyViewSettings, VocabularyViewSettingTab} from "./settings";
import {Words, Word, shuffle} from "./words";
import {VocabularyBook, extractNameFromPath} from "./vocabularybook";


export default class VocabularyView extends Plugin {

    settings: VocabularyViewSettings;
    // Map: vocabulary book name -> vocabulary book object
    vocabularyBooks: Map<string, VocabularyBook> = new Map<string, VocabularyBook>();

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {

        // load settings
        await this.loadSettings();

        // create settings tab
        let settingsTab = new VocabularyViewSettingTab(this.app, this);
        settingsTab.onSettingsChanged(async () => {
            await this.syncVocabularyBooksWithSettings();
        })
        // settingsTab.onVocabularyBookAdded(async (path: string) => {
        //     let vocabularyBook = new VocabularyBook(this.app, path);
        //     this.vocabularyBooks.set(vocabularyBook.getVocabularyBookName(), vocabularyBook);
        //     // console.log(`Vocabulary book ${vocabularyBook.getVocabularyBookName()} has been added.`);
        //     console.log(this.vocabularyBooks);
        //     await vocabularyBook.loadWordsFromDiskToCache();
        // })
        this.addSettingTab(settingsTab);

        // register Markdown code block processors
        this.registerMarkdownCodeBlockProcessor("vocaview-list1", (source, el, ctx) => {
            renderBlockTypeList(1, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-list2", (source, el, ctx) => {
            renderBlockTypeList(2, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-list3", (source, el, ctx) => {
            renderBlockTypeList(3, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-choice1", (source, el, ctx) => {
            renderBlockTypeChoice(1, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-choice2", (source, el, ctx) => {
            renderBlockTypeChoice(2, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-choice3", (source, el, ctx) => {
            renderBlockTypeChoice(3, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-card1", (source, el, ctx) => {
            renderBlockTypeCard(1, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-card2", (source, el, ctx) => {
            renderBlockTypeCard(2, source, el, ctx, this);
        });
        this.registerMarkdownCodeBlockProcessor("vocaview-card3", (source, el, ctx) => {
            renderBlockTypeCard(3, source, el, ctx, this);
        });

        // make sure the vocabularyBookPaths array has enough length
        if (this.settings.vocabularyBookPaths.length < this.settings.numOfVocabularyBooks) {
            // append empty paths to match the length to the number of vocabulary books
            for (let i = this.settings.vocabularyBookPaths.length; i < this.settings.numOfVocabularyBooks; i++) {
                this.settings.vocabularyBookPaths.push("");
            }
        }

        // load vocabulary books
        this.vocabularyBooks.clear();
        for (let i = 0; i < this.settings.numOfVocabularyBooks; i++) {
            // this.settings.vocabularyBookPaths may contain more paths than this.settings.numOfVocabularyBooks
            let path = this.settings.vocabularyBookPaths[i];
            let vocabularyBook = new VocabularyBook(this.app, path);
            this.vocabularyBooks.set(vocabularyBook.getVocabularyBookName(), vocabularyBook);
            await vocabularyBook.loadWordsFromDiskToCache();
        }

    }

    async syncVocabularyBooksWithSettings(): Promise<void> {
        // create a set of all paths visible in the settings tab
        // do not use new set(this.settings.vocabularyBookPaths) directly
        // because this.settings.vocabularyBookPaths may contain more paths than this.settings.numOfVocabularyBooks
        let allPaths = new Set<string>();
        for (let i = 0; i < this.settings.numOfVocabularyBooks; i++) {
            allPaths.add(this.settings.vocabularyBookPaths[i]);
        }

        // if a book exists only in the map, remove it
        for (const [name, book] of this.vocabularyBooks) {
            if (!allPaths.has(book.getVocabularyBookPath())) {
                this.vocabularyBooks.delete(name);
                // console.log(`Vocabulary book ${name} has been removed.`);
                // console.log(this.vocabularyBooks);
            }
        }

        // if a book exists only in the settings, add it
        for (const path of allPaths) {
            const bookName = extractNameFromPath(path);
            if (!this.vocabularyBooks.has(bookName)) {
                const fs = this.app.vault.adapter as FileSystemAdapter;
                let fileStatus = await VocabularyViewSettingTab.checkPath(path, fs);
                if (fileStatus === VocabularyBookPathStatus.EXISTS) {
                    let vocabularyBook = new VocabularyBook(this.app, path);
                    this.vocabularyBooks.set(vocabularyBook.getVocabularyBookName(), vocabularyBook);
                    // console.log(`Vocabulary book ${bookName} has been added.`);
                    // console.log(this.vocabularyBooks);
                    await vocabularyBook.loadWordsFromDiskToCache();
                }
            }
        }
    }
}


interface localedText {
    [key: string]: string
}


const localedTexts: { showHideAllBtn: localedText, accuracy: localedText, nextBtn: localedText } = {
    showHideAllBtn: {
        "zh-cn": "显示/隐藏全部",
        "zh-tw": "顯示/隱藏全部",
        "en": "Show/Hide All",
        "ja": "すべてを表示/隠す"
    },
    accuracy: {
        "zh-cn": "正确率",
        "zh-tw": "正確率",
        "en": "Accuracy",
        "ja": "正解率"
    },
    nextBtn: {
        "zh-cn": "下一个",
        "zh-tw": "下一個",
        "en": "Next",
        "ja": "次"
    }

}


class numberObj {
    private num: number = 0;
    increase: () => void;
    decrease: () => void;
    get: () => number;
    isZero: () => boolean;

    constructor(num: number) {
        this.num = num;
        this.increase = () => {
            num += 1;
        };
        this.decrease = () => {
            num -= 1;
        };
        this.get = () => {
            return num;
        };
        this.isZero = () => {
            return num === 0;
        };
    }
}

class booleanObj {
    private bool: boolean = false;
    set: () => void;
    clear: () => void;
    get: () => boolean;

    constructor(bool: boolean) {
        this.bool = bool;
        this.set = () => {
            this.bool = true;
        }
        this.clear = () => {
            this.bool = false;
        }
        this.get = () => {
            return this.bool;
        }
    }
}

function divIsHidden(div: HTMLElement) {
    return div.hasClass("hidden");
}

function divSetHidden(div: HTMLElement, hiddenCounter?: numberObj) {
    if (divIsHidden(div))
        return;
    div.addClass("hidden");
    hiddenCounter?.increase();
}

function divClearHidden(div: HTMLElement, hiddenCounter?: numberObj) {
    if (divIsHidden(div)) {
        div.removeClass("hidden");
        hiddenCounter?.decrease();
    }
}

function divToggleHidden(div: HTMLElement, hiddenCounter?: numberObj) {
    if (divIsHidden(div))
        divClearHidden(div, hiddenCounter);
    else
        divSetHidden(div, hiddenCounter);
}

function createOneSelectableItem(parentEl: HTMLElement): HTMLElement {
    return parentEl.createEl("li", {cls: "selectable-item"});
}

function fillSelectableItemWithWord(subtype: number, selectableItemEl: HTMLElement, word: Word)
    : [HTMLElement, HTMLElement] {
    let upperEl: HTMLElement, lowerEl: HTMLElement;

    switch (subtype) {
        default:
        case 1:
            upperEl = selectableItemEl.createDiv({
                cls: "upper",
                text: word.word
            });
            // initially hide all explanations
            lowerEl = selectableItemEl.createDiv({cls: ["lower", "hidden"]});
            lowerEl.createSpan({text: word.explanation});
            break;
        case 2:
            upperEl = selectableItemEl.createDiv({
                cls: "upper",
                text: word.explanation
            });
            // initially hide all explanations
            lowerEl = selectableItemEl.createDiv({cls: ["lower", "hidden"]});
            lowerEl.createSpan({text: word.word});
            break;
        case 3:
            const boolVar: boolean = Math.random() > 0.5;
            upperEl = selectableItemEl.createDiv({
                cls: "upper",
                text: boolVar ? word.word : word.explanation
            });
            // initially hide all explanations
            lowerEl = selectableItemEl.createDiv({cls: ["lower", "hidden"]});
            lowerEl.createSpan({text: boolVar ? word.explanation : word.word});
        // break;
    }

    return [upperEl, lowerEl];
}


function createAddToVocBookButtons(plugin: VocabularyView, word: Word) {
    let updateBtnTextAndStyle = (book: VocabularyBook, word: Word, btnEl: HTMLElement) => {
        if (book.hasWord(word.word)) {
            btnEl.innerText = "-" + book.getVocabularyBookName();
            btnEl.toggleClass("added", true);
        } else {
            btnEl.innerText = "+" + book.getVocabularyBookName();
            btnEl.toggleClass("added", false);
        }
    }

    // let vocbookButtonDivEl = parentEl.createDiv({cls: "vocbook-button-list"});
    let vocbookButtonDivEl = document.createElement("div") as HTMLDivElement;
    vocbookButtonDivEl.className = "vocbook-button-list";
    for (const [name, book] of plugin.vocabularyBooks) {
        let vocbookButtonEl = vocbookButtonDivEl.createEl("button", {
            cls: "vocbook-button",
            text: ""
        });
        updateBtnTextAndStyle(book, word, vocbookButtonEl);
        vocbookButtonEl.addEventListener("click", async (event: MouseEvent) => {
            event.stopPropagation(); // prevent the click event from propagating to the parent element
            if (book.hasWord(word.word))
                await book.removeWord(word);
            else
                await book.addWord(word);
            updateBtnTextAndStyle(book, word, vocbookButtonEl);
            // console.log("ctx.docID: " + ctx.docId);
            // console.log("ctx.sourcePath: " + ctx.sourcePath);
        });
    }

    return vocbookButtonDivEl;
}

function renderBlockTypeList(subtype: number, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: VocabularyView) {
    const words = new Words(source, ':');
    if (words.length < 1) return;

    let blockEl = el.createDiv({cls: "vocaview-block"});
    let listEl = blockEl.createEl("ul", {cls: "word-list"});
    let lowerElArr: HTMLElement[] = [];
    let numOfHidden: numberObj = new numberObj(0);
    let currentFileIsVocabularyBook: boolean = isCurrentFileVocabularyBook(ctx, plugin);

    // create word list
    for (const word of words) {
        let listItemEl = createOneSelectableItem(listEl);

        // create "Add to vocabulary book" buttons if current .md file is not itself a vocabulary book
        if (plugin.settings.numOfVocabularyBooks > 0 && !currentFileIsVocabularyBook) {
            let buttonsEl = createAddToVocBookButtons(plugin, word);
            listItemEl.appendChild(buttonsEl);
        }


        let [upperEl, lowerEl] = fillSelectableItemWithWord(subtype, listItemEl, word);
        numOfHidden.increase();

        listItemEl.addEventListener("click", () => {
            divToggleHidden(lowerEl, numOfHidden);
        });

        // cache explanation html elements for later use
        lowerElArr.push(lowerEl);
    }

    if (lowerElArr.length < 1) return;

    // create "show/hide all" button
    let bottomBarEl = blockEl.createDiv({cls: "bottom-bar"});
    let showHideAllBtnEl = bottomBarEl.createEl("button", {
        cls: "show-hide-button",
        text: localedTexts.showHideAllBtn[moment.locale()] ?? localedTexts.showHideAllBtn["en"]
    });
    showHideAllBtnEl.addEventListener("click", () => {
        // if the visibility of all explanations is not unified
        // we just unify them into the majority
        const n = numOfHidden.get();
        if (n > 0 && n < lowerElArr.length) {
            const unifyAsHidden: boolean = (n >= lowerElArr.length / 2);
            if (unifyAsHidden)
                lowerElArr.forEach((div) => {
                    divSetHidden(div, numOfHidden)
                });
            else
                lowerElArr.forEach((div) => {
                    divClearHidden(div, numOfHidden)
                });
            return;
        }

        // if the visibility of all explanations is already unified
        // toggle it
        lowerElArr.forEach((div) => {
            divToggleHidden(div, numOfHidden);
        });
    });
}

/**
 * Get a random question and options from the given words
 * @param subtype 1: word -> explanation, 2: explanation -> word, 3: random
 * @param words Words object
 * @param numOfOptions number of options
 * @returns [word, question, options] where question is a string equal to word.word or word.explanation
 */
function getRandomQuestionAndOptions(subtype: number, words: Words, numOfOptions: number): [Word, string, string[]] {
    numOfOptions = words.length < numOfOptions ? words.length : numOfOptions;
    const wordArr = words.getRandomWords(numOfOptions);
    let question: string = "";
    let options: string[] = [];
    switch (subtype) {
        default:
        case 1:
            question = wordArr[0].word;
            // for(let i = 0; i < wordArr.length; ++i) {options.push(wordArr[i].explanation);}
            options = Array.from(wordArr, word => word.explanation);
            break;
        case 2:
            question = wordArr[0].explanation;
            // for(let i = 0; i < wordArr.length; ++i) {options.push(wordArr[i].word);}
            options = Array.from(wordArr, word => word.word);
            break;
        case 3:
            const boolVar: boolean = Math.random() > 0.5;
            question = boolVar ? wordArr[0].word : wordArr[0].explanation;
            // for(let i = 0; i < wordArr.length; ++i) {options.push(boolVar ? wordArr[i].explanation : wordArr[i].word);}
            options = Array.from(wordArr, word => boolVar ? word.explanation : word.word);
        // break;
    }
    // options[0] is always the correct answer
    return [wordArr[0], question, options];
}

function renderBlockTypeChoice(subtype: number, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: VocabularyView) {
    const words = new Words(source, ":");
    let [word, question, options] = getRandomQuestionAndOptions(subtype, words, 4);

    let blockEl = el.createDiv({cls: "vocaview-block"});

    // create "Add to vocabulary book" buttons if current .md file is not itself a vocabulary book
    let addToVocBookButtonsEl: HTMLDivElement | undefined = undefined;
    let currentFileIsVocabularyBook: boolean = isCurrentFileVocabularyBook(ctx, plugin);
    if (plugin.settings.numOfVocabularyBooks > 0 && !currentFileIsVocabularyBook) {
        addToVocBookButtonsEl = createAddToVocBookButtons(plugin, word);
        blockEl.appendChild(addToVocBookButtonsEl);
    }

    // create question  and accuracy html elements
    let questionAndAccuracyEl = blockEl.createDiv({cls: "question-and-accuracy"});
    let questionEl = questionAndAccuracyEl.createDiv({
        cls: "question",
        text: question
    });
    let correctlyAnswered: numberObj = new numberObj(0);
    let totalAnswered: numberObj = new numberObj(0);
    let accuracyEl = questionAndAccuracyEl.createDiv({
        cls: "accuracy",
        text: ""
    });
    // create option html elements
    let optionsEl = blockEl.createEl("ul", {cls: "options"});

    const numOfOptions = options.length;
    let indexArr = Array.from(Array(numOfOptions).keys());
    shuffle(indexArr);

    let optionElArr: HTMLElement[] = [];
    for (let i = 0; i < indexArr.length; i++) {
        let optionEl = optionsEl.createEl("li", {
            cls: "selectable-item",
            text: options[indexArr[i]]
        });
        // cache option html elements for later use
        optionElArr.push(optionEl);
    }

    let allowSelection: booleanObj = new booleanObj(true);

    for (let optionEl of optionElArr) {
        optionEl.addEventListener("click", () => {
            // forbid multiple selection
            if (!allowSelection.get()) return;
            allowSelection.clear();
            // validate answer and update accuracy
            const correct: boolean = (optionEl.innerText === options[0]);
            totalAnswered.increase();
            if (correct) {
                optionEl.toggleClass("correct", true);
                correctlyAnswered.increase();
            } else {
                optionEl.toggleClass("wrong", true);
            }
            accuracyEl.innerText = `${localedTexts.accuracy[moment.locale()] ?? localedTexts.accuracy["en"]}: ${(100 * correctlyAnswered.get() / totalAnswered.get()).toFixed(1)}%`;
            // load next question
            setTimeout(() => {
                optionEl.toggleClass("correct", false);
                optionEl.toggleClass("wrong", false);
                [word, question, options] = getRandomQuestionAndOptions(subtype, words, numOfOptions);
                // create "Add to vocabulary book" buttons if current .md file is not itself a vocabulary book
                if (plugin.settings.numOfVocabularyBooks > 0 && !currentFileIsVocabularyBook) {
                    let newAddToVocBookButtonsEl = createAddToVocBookButtons(plugin, word);
                    if (addToVocBookButtonsEl) {
                        addToVocBookButtonsEl.parentNode?.replaceChild(newAddToVocBookButtonsEl, addToVocBookButtonsEl);
                        addToVocBookButtonsEl = newAddToVocBookButtonsEl; // update the reference. without this line, the buttons will only be updated for the first time
                    }
                }
                // modify the question and options
                questionEl.innerText = question;
                shuffle(indexArr);
                for (let i = 0; i < indexArr.length; i++) {
                    optionElArr[i].innerText = options[indexArr[i]];
                }
                allowSelection.set();
            }, 800);
        });
    }
}

/**
 * Get a random question and answer from the given words
 * @param subtype 1: word -> explanation, 2: explanation -> word, 3: random
 * @param words Words object
 * @returns [word, question, answer] where question is a string equal to word.word or word.explanation
 */
function getRandomQuestionAndAnswer(subtype: number, words: Words): [Word, string, string] {
    const word = words.getRandomWord();
    let question: string, answer: string;
    switch (subtype) {
        default:
        case 1:
            question = word.word;
            answer = word.explanation;
            break;
        case 2:
            question = word.explanation;
            answer = word.word;
            break;
        case 3:
            const boolVar: boolean = Math.random() > 0.5;
            question = boolVar ? word.word : word.explanation;
            answer = boolVar ? word.explanation : word.word;
        // break;
    }
    return [word, question, answer];
}

function renderBlockTypeCard(subtype: number, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: VocabularyView) {
    const words = new Words(source, ":");
    let blockEl = el.createDiv({cls: "vocaview-block"});

    let [word, question, answer] = getRandomQuestionAndAnswer(subtype, words);

    // create "Add to vocabulary book" buttons if current .md file is not itself a vocabulary book
    let addToVocBookButtonsEl: HTMLDivElement | undefined = undefined;
    let currentFileIsVocabularyBook: boolean = isCurrentFileVocabularyBook(ctx, plugin);
    if (plugin.settings.numOfVocabularyBooks > 0 && !currentFileIsVocabularyBook) {
        addToVocBookButtonsEl = createAddToVocBookButtons(plugin, word);
        blockEl.appendChild(addToVocBookButtonsEl);
    }

    let questionAndAnswerEl = blockEl.createDiv({cls: "question-and-answer"})

    // create question html element
    let questionEl = questionAndAnswerEl.createDiv({
        cls: "question",
        text: question
    });
    // create answer html element
    let answerEl = questionAndAnswerEl.createDiv({cls: "answer"}).createDiv({
        cls: ["answer-text", "hidden"]
    });
    let answerSpanEl = answerEl.createSpan({text: answer});
    questionAndAnswerEl.addEventListener("click", () => {
        divToggleHidden(answerEl, undefined);
    });
    let bottomBarEl = blockEl.createDiv({cls: "bottom-bar"});
    // create placeholder button element
    bottomBarEl.createEl("button", {
        cls: "placeholder-button",
        text: localedTexts.nextBtn[moment.locale()] ?? localedTexts.nextBtn["en"]
    });
    // create spell input html element
    let spellInputEl = bottomBarEl.createEl("input", {
        cls: "spell",
        type: "text",
        attr: {"spellcheck": "false"}
    });
    // check answer
    spellInputEl.addEventListener("keydown", () => {
        setTimeout(() => {
            let correctAnswer = answerSpanEl.textContent;
            let userAnswer = spellInputEl.value;
            if (userAnswer.trim() === "")
                return;
            if (userAnswer.trim() === correctAnswer) {
                spellInputEl.toggleClass("correct", true);
                spellInputEl.toggleClass("wrong", false);
            } else {
                spellInputEl.toggleClass("correct", false);
                spellInputEl.toggleClass("wrong", true);
            }
        }, 200);
    });
    // create next button html element
    let nextButtonEl = bottomBarEl.createEl("button", {
        cls: "next-button",
        text: localedTexts.nextBtn[moment.locale()] ?? localedTexts.nextBtn["en"]
    });
    nextButtonEl.addEventListener("click", () => {
        [word, question, answer] = getRandomQuestionAndAnswer(subtype, words);

        // create "Add to vocabulary book" buttons if current .md file is not itself a vocabulary book
        if (plugin.settings.numOfVocabularyBooks > 0 && !currentFileIsVocabularyBook) {
            let newAddToVocBookButtonsEl = createAddToVocBookButtons(plugin, word);
            if (addToVocBookButtonsEl) {
                addToVocBookButtonsEl.parentNode?.replaceChild(newAddToVocBookButtonsEl, addToVocBookButtonsEl);
                addToVocBookButtonsEl = newAddToVocBookButtonsEl; // update the reference. without this line, the buttons will only be updated for the first time
            }
        }

        questionEl.innerText = question;
        answerSpanEl.innerText = answer;
        divSetHidden(answerEl, undefined);
        spellInputEl.toggleClass("correct", false);
        spellInputEl.toggleClass("wrong", false);
        spellInputEl.value = "";
        spellInputEl.focus();
    });

}

function isCurrentFileVocabularyBook(ctx: MarkdownPostProcessorContext, plugin: VocabularyView): boolean {
    return plugin.vocabularyBooks.has(extractNameFromPath(ctx.sourcePath));
}