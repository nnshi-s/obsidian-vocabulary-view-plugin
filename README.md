## Obsidian Vocabulary View
Vocabulary view is a plugin for obsidian using which you can write down some words with their explanations and preview them in a vocabulary test style.

![show](https://raw.githubusercontent.com/nnshi-s/obsidian-vocabulary-view-plugin/main/readme_img/readme_show.png)

### Usage
Create a block with the following format:
```
    ```vocaview-<blocktype><subtype>
    word: explanation
    ...

    ```
```
### Blocktypes
There are 3 types of block available:  
- **list**:   Preview the words as a list. All words are shown.
- **choice**: Preview the words in a single choice queston style. One randomly picked word at a time.
- **card**:   Preview the words as a card. One randomly picked word at a time.

### Subtypes
For each block type, 3 subtypes are available:  
- 1: Show word, hide explanation.
- 2: Show explanation, hide word.
- 3: Randomly mix subtype 1 and 2.

### Example
For example:  
```
    ```vocaview-list3
    word1: explanation1
    word2: explanation2
    word3: explanation3
    word4: explanation4
    ```
```
is going to be previewed something like this:  

![example](https://raw.githubusercontent.com/nnshi-s/obsidian-vocabulary-view-plugin/main/readme_img/readme_example.png)


### Manually installing the plugin
- Disable obsidian safe mode.
- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.