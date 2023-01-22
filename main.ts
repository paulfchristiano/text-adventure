type uid = string;

type Item = {
    description: string;
    name: string;
    subname?: string;
    id: uid;
}

type Memory = {
    [name: string]: Item[];
}

const itemsByID:{[id:string]:Item} = {}; //index is uid
const defaultByName:{[name:string]:Item} = {};
const memory:{[name:string]:Item[]} = {};
const actionsBySubjectID:{[id:string]:Action[]} = {};

function initializeItems(items:Item[]) {
    for (const item of items) {
        itemsByID[item.id] = item;
        if (defaultByName[item.name] === undefined) defaultByName[item.name] = item;
    }
}

type Action = {
    subject: uid[];
    object?: uid[];
    name: string;
    description: string;
    results: uid[];
}

function initializeActions(actions:Action[]) {
    for (const action of actions) {
        for (const subject of action.subject) {
            if (actionsBySubjectID[subject] === undefined) actionsBySubjectID[subject] = [];
            actionsBySubjectID[subject].push(action);
        }
    }
}

const inventory:Item[] = [];

type GameState = {
    inventory: Item[];
    memory: Memory;
    previous: GameState | null;
}

// TODO: abstract out the bank state and so on

type UIState = {
    state: GameState;
    selected: number[]; // which items from inventory are selected
    focused: number|undefined; // which of the output words is being edited
    confirmed: boolean[]; // which of the output words have been confirmed
    bankLetters: string[];
    outputWords: [string[], string[]];
    targeting: {action: Action, subject: number}|undefined; // are you picking targets for an action?
}

function popMemory(name: string, memory:Memory): [Item|null, Memory] {
    const items = memory[name];
    if (items == undefined || items.length == 0) return [null, memory]
    const result = items[items.length - 1];
    const newMemory = {...memory, name: items.slice(0, items.length - 1)};
    return [result, newMemory]
}

function pushMemory(item:Item, memory:Memory): Memory {
    const items = memory[item.name];
    if (items == undefined) {
        return {...memory, [item.name]: [item]};
    } else {
        return {...memory, [item.name]: [...items, item]};
    }
}

function itemForWord(word:string, memory:Memory): [Item|null, Memory] {
    const [item, newMemory] = popMemory(word, memory);
    if (item != null) return [item, newMemory];
    return [defaultByName[word], memory];
}

function transformWords(state:GameState, selected:number[], outputs:string[]): GameState | string {
    const items = selected.map(i => state.inventory[i]);
    let memory = state.memory;
    for (const item of items) {
        memory = pushMemory(item, memory)
    }
    const outputItems:Item[] = [];
    for (const output of outputs) {
        const [item, newMemory] = itemForWord(output, memory);
        if (item == null) return `Sorry, I can't make ${output.toUpperCase()}`;
        outputItems.push(item);
        memory = newMemory;
    }
    const newInventory = state.inventory.slice();
    for (let i = 0; i < selected.length; i++) {
        const replacementItem = outputItems[i];
        if (replacementItem == undefined) {
            newInventory.splice(selected[i], 1);
        } else {
            newInventory.splice(selected[i], 1, replacementItem);
        }
    }
    return {...state, inventory: newInventory, memory: memory, previous: state};
}

function globalTransformWords(selected:number[], outputs:string[]) {
    const newState = transformWords(globalUIState.state, selected, outputs);
    if (typeof newState == "string") {
        return
    }
    globalUIState = freshUI(newState)
    refreshUI();
}

function takeAction(state:GameState, action:Action, subject:number, object?:number): GameState | string {
    if (subject < 0 || (object != undefined && object < 0)) return "I can't find a valid subject or object";
    const newInventory = state.inventory.slice();
    const toRemove: number[] = [subject];
    if (object != undefined) toRemove.push(object);
    const toAdd: Item[] = action.results.map(id => itemsByID[id]);
    for (let i = 0; i < toRemove.length; i++) {
        const replacementItem = toAdd[i];
        if (replacementItem == undefined) {
            newInventory.splice(toRemove[i], 1);
        } else {
            newInventory.splice(toRemove[i], 1, replacementItem);
        }
    }
    return {...state, inventory: newInventory, previous: state};
}

function globalTakeAction(action:Action, subject:number, object?:number) {
    if (object === undefined && action.object !== undefined) {
        globalUIState.targeting = {action: action, subject: subject};
    } else {
        const newState = takeAction(globalUIState.state, action, subject, object);
        if (typeof newState == "string") {
            return
        }
        globalUIState = freshUI(newState)
        refreshUI();
    }
}

function refreshUI() {
    renderInventory(globalUIState)
    renderBank(globalUIState)
    renderUndo(globalUIState)
}

function renderUndo(state:UIState) {
    const undoButton = document.getElementById('undoButton');
    if (undoButton == null) return;
    if (state.state.previous !== null) {
        undoButton.onclick = () => {
            globalUIState = freshUI(state.state.previous as GameState);
            refreshUI();
        }
    }
}

function freshUI(state:GameState): UIState {
    return {state: state, selected: [], bankLetters: [], outputWords: [[], []], focused: undefined, confirmed: [], targeting: undefined};
}

function reprItem(item:Item): string {
    if (item.subname === undefined) return item.name.toUpperCase()
    else return `${item.name.toUpperCase()} (${item.subname.toUpperCase()})`
}

function renderItem(item:Item, index:number, selected:boolean, actions:Action[], targeting?:{action:Action, subject:number}): HTMLDivElement {
    const result = document.createElement('div');
    result.className = 'inventoryItem'
    const itemSpan = document.createElement('span')
    itemSpan.className = 'itemSpan'
    //itemSpan.setAttribute('selected', selected ? 'true' : 'false')
    let text = reprItem(item)
    if (selected) text = `[${text}]`;
    itemSpan.innerHTML = text
    result.appendChild(itemSpan)
    if (targeting === undefined) {
        itemSpan.addEventListener('click', () => globalSelectItem(index))
    } else {
        if (validTarget(targeting.action, targeting.subject, item, index)) {
            itemSpan.setAttribute('validTarget', 'true')
            itemSpan.addEventListener('click', () => globalTakeAction(targeting.action, targeting.subject, index))
        }
    }
    for (const action of actions) {
        const actionSpan = document.createElement('span');
        actionSpan.className = 'action';
        actionSpan.innerHTML = action.name;
        actionSpan.addEventListener('click', () => globalTakeAction(action, index))
        result.appendChild(actionSpan)
    }
    return result
}

function isApplicable(action:Action, subject:number, inventory:Item[]): boolean {
    if (action.object === undefined) return true
    else return inventory.find((item, i) => validTarget(action, subject, item, i)) != undefined;
}

function validTarget(action:Action, subject:number, target:Item, targetIndex:number) {
    if (subject == targetIndex) return false;
    if (action.object === undefined) return true;
    return action.object.indexOf(target.id) >= 0;
}

function renderInventory(state:UIState, targeting?:{action:Action, subject:number}) {
    const inventoryDiv = document.getElementById("inventoryItems");
    const inventory = state.state.inventory
    const actions = inventory.map((item, i) => (actionsBySubjectID[item.id] || []).filter(a => isApplicable(a, i, inventory)));
    if (inventoryDiv != null) {
        inventoryDiv.innerHTML = "";
        for (let i = 0; i < inventory.length; i++) {
            inventoryDiv.appendChild(renderItem(inventory[i], i, state.selected.indexOf(i) >= 0, actions[i], targeting))
        }
    }
}

function renderBank(state:UIState) {
    const input1Span = document.getElementById("input1");
    if (input1Span != null) {
        input1Span.innerHTML = (state.selected[0] === undefined) ? '' : reprItem(state.state.inventory[state.selected[0]]);
    }
    const input2Span = document.getElementById("input2");
    if (input2Span != null) {
        input2Span.innerHTML = (state.selected[1] === undefined) ? '' : reprItem(state.state.inventory[state.selected[1]]);
    }
    document.getElementById('output1span')?.setAttribute('focused', state.focused == 0 ? 'true' : 'false')
    document.getElementById('output2span')?.setAttribute('focused', state.focused == 1 ? 'true' : 'false')
    const bankLettersSpan = document.getElementById("wordbank");
    if (bankLettersSpan != null) bankLettersSpan.innerHTML = state.bankLetters.join("").toUpperCase();
    const output1Span = document.getElementById("output1");
    if (output1Span != null) {
        output1Span.innerHTML = state.outputWords[0].join("").toUpperCase();
        output1Span.setAttribute('confirmed', state.confirmed[0] ? 'true' : 'false')
    }
    const output2Span = document.getElementById("output2");
    if (output2Span != null) {
        output2Span.innerHTML = state.outputWords[1].join("").toUpperCase();
        output2Span.setAttribute('confirmed', state.confirmed[1] ? 'true' : 'false')
    }
}

// TODO: be consistent about what is global
function globalSelectItem(index:number) {
    if (globalUIState.selected.length >= 2) {
        clearSelection(globalUIState)
    }
    if (globalUIState.selected.indexOf(index) >= 0) return
    globalUIState.selected.push(index)
    // add all letters in the name of the item to bankLetters
    const item = globalUIState.state.inventory[index]
    for (let i = 0; i < item.name.length; i++) globalUIState.bankLetters.push(item.name[i])
    refreshUI()
}

// TODO: unify with freshUI
function clearSelection(state:UIState) {
    state.selected = []
    state.outputWords = [[], []]
    state.bankLetters = []
    state.focused = undefined
    state.confirmed = []
}

// update the bank, confirmed words, etc. when k is typed
function executeLetter(state:UIState, k:string) {
    const inBank = state.bankLetters.indexOf(k) >= 0
    if (state.focused === undefined) state.focused = 0
    const focus = state.focused as number
    const inOther = state.outputWords[1-focus].indexOf(k) >= 0
    const inSelf = state.outputWords[focus].indexOf(k) >= 0
    const otherEmpty = state.outputWords[1-focus].length == 0
    if (state.confirmed[state.focused]) {
        if (otherEmpty && inBank) {
            state.focused = 1 - focus
            addLetter(state, k)
        } else if (inSelf || inBank) {
            deleteWord(state)
            addLetter(state, k)
        } else if (inOther) {
            state.focused = 1 - state.focused
            deleteWord(state)
            addLetter(state, k)
        }
    } else {
        if (inBank) {
            addLetter(state, k)
        } else if (inOther) {
            state.focused = 1 - state.focused
            deleteWord(state)
            state.focused = 1 - state.focused
            addLetter(state, k)
        }
    }
}

// adds the letter from the bank to the focused word
function addLetter(state:UIState, k:string) {
    const focus = state.focused || 0
    let n = state.bankLetters.indexOf(k)
    if (n >= 0) {
        state.bankLetters.splice(n, 1)
        state.outputWords[focus].push(k)
        state.confirmed[focus] = false
    } else {
        console.log(`error! didn't find ${k} in bank`)
    }
}

function deleteLetter(state:UIState) {
    const focus = state.focused || 0
    if (state.outputWords[focus].length > 0) {
        state.bankLetters.push(state.outputWords[focus].pop() as string)
    }
}

// randomly reorder an array in place
function scramble<T>(array:T[]) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// delete the current focused word
function deleteWord(state:UIState) {
    const focus = state.focused || 0
    state.confirmed[focus] = false
    const bits = state.outputWords[focus]
    while (bits.length > 0) {
        state.bankLetters.push(bits.shift() as string)
    }
}

// try to confirm the current focused word
// return true if there is a transformation
function confirmWord(state:UIState): boolean {
    const focus = state.focused || 0
    const word = state.outputWords[focus].join("")
    if (defaultByName[word] != undefined) {
        state.confirmed[focus] = true
        if (state.confirmed[0] && state.confirmed[1]) {
            const result = transformWords(state.state, state.selected, state.outputWords.map(w => w.join("")))
            if (typeof result != 'string') {
                state.state = result
                clearSelection(state)
                return true
            } 
        } else {
            state.focused = 1 - focus
        }
    }  
    return false
}

document.addEventListener('keydown', (event) => {
    const keyName = event.key;
    if (keyName == 'Escape') {
        clearSelection(globalUIState)
        refreshUI()
    } else if (keyName == 'Enter') {
        if (confirmWord(globalUIState)) {
            refreshUI()
        } else {
            renderBank(globalUIState)
        }
    } else if (keyName == 'Backspace') {
        deleteLetter(globalUIState)
        renderBank(globalUIState)
    } else if (keyName == ' ') {
        scramble(globalUIState.bankLetters)
        renderBank(globalUIState)
    } else if (keyName.length == 1) {
        executeLetter(globalUIState, keyName)
        renderBank(globalUIState)
    }
})

function byID(ids:string[]): Item[] {
    return ids.map(id => itemsByID[id])
}

function serialize(state:GameState): string {
    return state.inventory.map(item => item.id).join(",")
}

function deserialize(state:string): GameState {
    return {inventory: byID(state.split(",")), memory: {}, previous: null}
}

initializeItems(items)
initializeActions(actions)

//let globalUIState = freshUI({inventory: byID(['ace of spades', 'two of spades', 'three of spades', 'four of spades', 'five of spades', 'six of spades', 'seven of spades', 'eight of spades', 'nine of spades', 'ten of spades', 'jack of spades', 'queen of spades', 'king of spades']), memory: {}, previous: null});
let globalUIState = freshUI({inventory: byID(['ace of spades', 'two of spades', 'three of spades', 'four of spades']), memory: {}, previous: null});

document.addEventListener('DOMContentLoaded', () => {
    refreshUI()
})

//TODO:

// small

// load a state when you type it into the URL, change the URL when you change the state
// allow single-item anagrams
// some kind of keyboard shortcuts for selecting items and using actions
// make synonyms available? or some other way of implicitly representing a lot of stuff
// move the definitions into a separate file
// tooltips
// click selected item to unselect

// refactor

// a Widget should provide:
// a permanent state
// a temporary state
// an update on a selected wordlist when clicked, which also updates temporary state
// a key handler (maybe this is the only key handler? tab can be reserved)
// a way to render itself
// 

// big

// abstract out the anagram state and then allow there to be multiple widgets (tab between them)
// figure out how to get a bunch of inputs automatically from gpt-3...
// synonym selection