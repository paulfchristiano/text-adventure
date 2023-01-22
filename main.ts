type uid = string;

type Item = {
    readonly description: string;
    readonly name: string;
    readonly subname?: string;
    readonly id: uid;
}

const itemsByID:{[id:string]:Item} = {}; //index is uid
const defaultByName:{[name:string]:Item} = {};
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

type GameState = {
    readonly inventory: readonly Item[];
    readonly memory: Memory; // eventually want to factor this as AnagramCircle's state...
    readonly previous: GameState | null;
}

type Memory = {
    readonly [name: string]: Item[];
}

type SelectionResponse = 'accept' | 'reject' | 'remove' | 'clear';

// A widget tracks *mutable* state for the current workspace
// Its operations take as input an immutable Memory (will have general state)
class AnagramCircle {
    private focused: number|null; // which of the output words is being edited
    private confirmed: boolean[]; // which of the output words have been confirmed
    private bankLetters: string[];
    private outputWords: string[][];
    private inputs:Array<Item|null>;
    private readonly inputSpans:Array<HTMLSpanElement> = [];
    private wordBankDiv:HTMLDivElement = document.createElement('div');
    private readonly outputNumbers:Array<HTMLSpanElement> = [];
    private readonly outputSpans:Array<HTMLSpanElement> = [];
    constructor(private readonly size:number) {
        this.clear();
    }
    initializeRendering(location:HTMLDivElement) {
        // Initialize rendering
        const inputDiv = document.createElement('div')
        inputDiv.className = 'wordPair';
        for (let i = 0; i < this.size; i++) {
            const nextDiv = document.createElement('div');
            const numberSpan = document.createElement('span')
            numberSpan.innerText = `${i+1}. `;
            const inputSpan = document.createElement('span');
            this.inputSpans.push(inputSpan);
            nextDiv.appendChild(numberSpan);
            nextDiv.appendChild(inputSpan);
            inputDiv.appendChild(nextDiv);
        }
        location.appendChild(inputDiv);
        this.wordBankDiv = document.createElement('div');
        this.wordBankDiv.style.fontSize = '2em'
        this.wordBankDiv.style.fontFamily = 'monospace'
        this.wordBankDiv.style.height = '1em'
        location.appendChild(this.wordBankDiv);
        const outputDiv = document.createElement('div')
        outputDiv.className = 'wordPair';
        for (let i = 0; i < this.size; i++) {
            const nextDiv = document.createElement('div');
            const numberSpan = document.createElement('span')
            numberSpan.innerText = `${i+1}. `;
            this.outputNumbers.push(numberSpan);
            const outputSpan = document.createElement('span');
            this.outputSpans.push(outputSpan);
            nextDiv.appendChild(numberSpan);
            nextDiv.appendChild(outputSpan);
            outputDiv.appendChild(nextDiv);
        }
        location.appendChild(outputDiv);
    }
    clear() {
        this.confirmed = new Array(this.size).fill(false);
        this.bankLetters = []
        this.outputWords = new Array(this.size); for (let i = 0; i < this.size; i++) this.outputWords[i] = [];
        this.inputs = new Array(this.size).fill(null)
        this.focused = null;
    }
    popMemory(name: string, memory:Memory): [Item|null, Memory] {
        const items = memory[name];
        if (items == undefined || items.length == 0) return [null, memory]
        const result = items[items.length - 1];
        const newMemory = {...memory}
        newMemory[name] = items.slice(0, items.length - 1);
        return [result, newMemory]
    }
    pushMemory(item:Item, memory:Memory): Memory {
        const items = memory[item.name];
        if (items == undefined) {
            return {...memory, [item.name]: [item]};
        } else {
            return {...memory, [item.name]: [...items, item]};
        }
    }
    itemForWord(word:string, memory:Memory): [Item|null, Memory] {
        const [item, newMemory] = this.popMemory(word, memory);
        if (item != null) return [item, newMemory];
        return [defaultByName[word], newMemory];
    }
    // transform operations generally emit a set of new items to create
    // (replacing selected items, for now)
    // and a new value for the widget's memory
    // return null to indicate that no transformation occurs
    transformWords(inputs:Item[], outputs:string[], memory:Memory): null|[Item[], Memory] {
        const outputItems:Item[] = [];
        for (const input of inputs) memory = this.pushMemory(input, memory)
        for (const output of outputs) {
            const [item, newMemory] = this.itemForWord(output, memory);
            if (item == null) throw Error(`No item for word ${output.toUpperCase()}`);
            outputItems.push(item);
            memory = newMemory;
        }
        return [outputItems, memory];
    }
    render() {
        for (let i = 0; i < this.size; i++) {
            const inputSpan = this.inputSpans[i];
            inputSpan.innerHTML = (this.inputs[i] === null) ? '' : reprItem(this.inputs[i] as Item);
        }
        this.wordBankDiv.innerText = this.bankLetters.join("").toUpperCase();
        for (let i = 0; i < this.size; i++) {
            const outputSpan = this.outputSpans[i];
            outputSpan.innerText = this.outputWords[i].join("").toUpperCase();
            outputSpan.setAttribute('confirmed', this.confirmed[i] ? 'true' : 'false')
            const outputNumber = this.outputNumbers[i];
            outputNumber.setAttribute('focused', this.focused == i ? 'true' : 'false')
        }
    }
    select(item:Item, present:boolean): SelectionResponse {
        if (present) {
            const index = this.inputs.indexOf(item);
            if (index == -1) throw Error("Item not present in inputs");
            this.inputs[index] = null;
            this.resetBankLetters()
            return 'remove';
        } else {
            const index = this.inputs.indexOf(null);
            if (index == -1) {
                this.clear()
                this.addItem(item, 0)
                return 'clear'
            } else {
                this.addItem(item, index)
                return 'accept'
            }
        }
    }
    addItem(item:Item, index:number) {
        this.inputs[index] = item;
        this.extendBankLetters(item)
    }
    extendBankLetters(item:Item) {
        for (let i = 0; i < item.name.length; i++) this.bankLetters.push(item.name[i])
    }
    resetBankLetters() {
        this.bankLetters = [];
        for (const item of this.inputs) {
            if (item != null) this.extendBankLetters(item)
        }
        for (let i = 0; i < this.size; i++) {
            this.outputWords[i] = [];
            this.confirmed[i] = false
            this.focused = null
        };
    }
    // update the bank, confirmed words, etc. when k is typed
    executeLetter(k:string) {
        const inBank = this.bankLetters.indexOf(k) >= 0
        if (this.focused === null) this.focused = 0
        const focus = this.focused as number
        const inOther:number = this.outputWords.findIndex((word, i) => i != focus && word.indexOf(k) >= 0)
        const inSelf = this.outputWords[focus].indexOf(k) >= 0
        const otherEmpty:number = this.outputWords.findIndex(word => word.length == 0)
        if (this.confirmed[focus]) {
            if (inBank && otherEmpty >= 0) {
                this.focused = otherEmpty
                this.addLetter(otherEmpty, k)
            } else if (inSelf || inBank) {
                this.deleteWord(focus)
                this.addLetter(focus, k)
            } else if (inOther >= 0) {
                this.deleteWord(inOther)
                this.focused = inOther
                this.addLetter(inOther, k)
            }
        } else {
            if (inBank) {
                this.addLetter(focus, k)
            } else if (inOther >= 0) {
                this.deleteWord(inOther)
                this.addLetter(focus, k)
            }
        }
    }

    // adds the letter from the bank to the word with a given index
    addLetter(index:number, k:string) {
        let n = this.bankLetters.indexOf(k)
        if (n >= 0) {
            this.bankLetters.splice(n, 1)
            this.outputWords[index].push(k)
            this.confirmed[index] = false
        } else {
            console.log(`error! didn't find ${k} in bank`)
        }
    }

    deleteLetter(index:number) {
        if (this.outputWords[index].length > 0) {
            this.bankLetters.push(this.outputWords[index].pop() as string)
        }
    }

    // delete the current focused word
    deleteWord(index:number) {
        this.confirmed[index] = false
        const bits = this.outputWords[index]
        while (bits.length > 0) {
            this.bankLetters.push(bits.shift() as string)
        }
    }

    // try to confirm the current focused word
    // return the transformation if any
    confirmWord(index:number, memory:Memory): null|[Item[], Memory] {
        const word = this.outputWords[index].join("")
        if (defaultByName[word] === undefined) return null // not a valid word
        this.confirmed[index] = true
        if (count(this.confirmed, x => x) == count(this.inputs, x => x !== null) && this.bankLetters.length == 0) {
            const result = this.transformWords(
                this.inputs.filter(x => x !== null) as Item[],
                this.outputWords.filter(w => w.length > 0).map(w => w.join("")),
                memory)
            this.clear()
            return result
        }
        return null
    }

    handleKey(key:string, memory:Memory): null|[Item[], Memory] {
        if (key == 'Enter') {
            if (this.focused !== null) {
                const result = this.confirmWord(this.focused, memory)
                this.render()
                return result
            }
        } else if (key == 'Backspace') {
            if (this.focused !== null) {
                this.deleteLetter(this.focused)
                this.render()
            }
        } else if (key == ' ') {
            scramble(this.bankLetters)
            this.render()
        } else if (key.length == 1) {
            this.executeLetter(key);
            this.render()
        }
        return null
    }
}

function count<T>(arr: T[], predicate: (x:T) => boolean): number {
    let count = 0;
    for (const x of arr) {
        if (predicate(x)) count++;
    }
    return count;
}

function takeAction(inventory:readonly Item[], action:Action, subject:number, object?:number): readonly Item[] {
    if (subject < 0 || (object != undefined && object < 0)) return inventory;
    const newInventory = inventory.slice();
    const toRemove: number[] = [subject];
    if (object != undefined) toRemove.push(object);
    const toAdd: Item[] = action.results.map(id => itemsByID[id]);
    for (let i = 0; i < toRemove.length; i++) {
        newInventory.splice(toRemove[i], 1, toAdd[i])
    }
    return newInventory;
}

function reprItem(item:Item): string {
    if (item.subname === undefined) return item.name.toUpperCase()
    else return `${item.name.toUpperCase()} (${item.subname.toUpperCase()})`
}


class UIState {
    private itemsDiv: HTMLDivElement;
    private undoButton: HTMLSpanElement;
    public selected: number[]; // which items from inventory are selected
    public targeting: {action: Action, subject: number}|null; // are you picking targets for an action?
    constructor (
        public state: GameState,
        public circle: AnagramCircle,
    ) {
        this.clear()
    }
    initializeRendering(location:HTMLDivElement) {
        const header = document.createElement('div');
        this.undoButton = document.createElement('span');
        this.undoButton.className = 'standardBox';
        this.undoButton.innerText = 'Undo'
        header.appendChild(this.undoButton);
        location.appendChild(header);
        const circleDiv = document.createElement('div')
        this.circle.initializeRendering(circleDiv)
        location.appendChild(circleDiv)
        const inventoryDiv = document.createElement('div');
        const inventoryHeader = document.createElement('div');
        inventoryHeader.innerText = 'Inventory';
        inventoryHeader.style.fontSize = '2em'
        inventoryDiv.appendChild(inventoryHeader);
        this.itemsDiv = document.createElement('div');
        inventoryDiv.appendChild(this.itemsDiv);
        this.itemsDiv.style.fontSize = '1.2em'
        location.appendChild(inventoryDiv);
        this.renderInventory()
        this.renderUndo()
    }
    takeAction(action:Action, subject:number, object?:number) {
        this.updateState({inventory: takeAction(this.state.inventory, action, subject, object)})
    }
    render() {
        this.renderInventory()
        this.renderUndo()
        this.circle.render()
    }
    renderUndo() {
        this.undoButton.onclick = () => {if (this.state.previous != null) {
            this.state = this.state.previous;
            this.clear();
            this.render();
        }}
    }
    renderInventory() {
        while (this.itemsDiv.firstChild) this.itemsDiv.removeChild(this.itemsDiv.firstChild);
        const inventory = this.state.inventory
        const actions = inventory.map((item, i) => (actionsBySubjectID[item.id] || []).filter(a => isApplicable(a, i, inventory)));
        for (let i = 0; i < inventory.length; i++) {
            const isTarget = (this.targeting != null && validTarget(this.targeting, inventory[i], i))
            const ui = this
            const itemCallback = () => {
                if (ui.targeting !== null) {
                    if (isTarget) {
                        ui.takeAction(ui.targeting.action, ui.targeting.subject, i);
                    } else {
                        ui.targeting == null;
                        ui.selectItem(i);
                    }
                } else {
                    ui.selectItem(i)
                }
            }
            const actionCallback = (action:Action) => {
                if (action.object === undefined) ui.takeAction(action, i)
                else {
                    ui.targeting = {action, subject: i}
                    ui.render()
                }
            }
            this.itemsDiv.appendChild(itemDiv(
                inventory[i],
                ui.selected.indexOf(i) >= 0,
                isTarget,
                actions[i],
                itemCallback,
                actionCallback
            ))
        }
    }
    selectItem(index:number) {
        const response = this.circle.select(this.state.inventory[index], this.selected.indexOf(index) >= 0)
        switch (response) {
            case 'accept': this.selected.push(index); this.render(); break;
            case 'clear': this.selected = [index]; this.render(); break;
            case 'remove':
                const i = this.selected.indexOf(index);
                if (i >= 0) this.selected.splice(i, 1);
                this.render()
            case 'reject': break;
            default: assertNever(response)
        }
    }
    clear() {
        this.selected = [];
        this.circle.clear();
        this.targeting = null
    }
    handleKey(key:string) {
        if (key == 'Escape') {
            this.clear()
            this.render()
        } else {
            const result = this.circle.handleKey(key, this.state.memory)
            if (result != null) {
                const newItems = removeSelected(this.state.inventory, this.selected)
                for (let i = 0; i < result[0].length; i++) {
                    newItems.push(result[0][i])
                }
                this.updateState({inventory:newItems, memory:result[1]})
            }
        }
    }
    updateState(update:{inventory?:readonly Item[], memory?:Memory}) {
        this.state = {...this.state, ...update, previous:this.state}
        this.clear()
        this.render()
    }
}

function removeSelected<T>(items:readonly T[], selected:number[]): T[] {
    const result: T[] = []
    for (let i = 0; i < items.length; i++) {
        if (selected.indexOf(i) < 0) result.push(items[i])
    }
    return result
}

function assertNever(x: never): never {
    throw new Error(`Unexpected: ${x}`)
}

function itemDiv(
    item:Item,
    selected:boolean,
    validTarget:boolean,
    actions:Action[],
    itemCallback:() => void,
    actionCallback:(action:Action) => void
): HTMLDivElement {
    const result = document.createElement('div');
    result.className = 'inventoryItem'
    const itemName = document.createElement('div')
    itemName.className = 'itemName'
    let text = reprItem(item)
    if (selected) text = `[${text}]`
    itemName.innerText = text
    const tooltip = document.createElement('span')
    tooltip.className = 'tooltip'
    tooltip.innerText = item.description
    itemName.appendChild(tooltip)
    result.appendChild(itemName)
    itemName.addEventListener('click', itemCallback)
    if (validTarget) result.setAttribute('validTarget', 'true')
    for (const action of actions) {
        const actionDiv = document.createElement('div')
        actionDiv.className = 'action'
        actionDiv.innerText = action.name.toUpperCase()
        const tooltip = document.createElement('span')
        tooltip.className = 'tooltip'
        tooltip.innerText = action.description
        actionDiv.appendChild(tooltip)
        result.appendChild(actionDiv)
        actionDiv.addEventListener('click', () => actionCallback(action))
    }
    return result;
}

function isApplicable(action:Action, subject:number, inventory:readonly Item[]): boolean {
    if (action.object === undefined) return true
    else return inventory.find((item, i) => validTarget({action:action, subject:subject}, item, i)) != undefined;
}

function validTarget(targeting:{action:Action, subject:number}, target:Item, targetIndex:number) {
    if (targeting.subject == targetIndex) return false;
    if (targeting.action.object === undefined) return true;
    return targeting.action.object.indexOf(target.id) >= 0;
}

// randomly reorder an array in place
function scramble<T>(array:T[]) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

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

const initialInventory = byID(['melon', 'ace of spades', 'two of spades', 'three of spades', 'four of spades'])

const state = new UIState({inventory: initialInventory, memory: {}, previous: null}, new AnagramCircle(2))

document.addEventListener('DOMContentLoaded', () => {
    state.initializeRendering(document.getElementById('game') as HTMLDivElement)
    document.addEventListener('keydown', (e) => {state.handleKey(e.key)})
})

//TODO:

// small

// some kind of keyboard shortcuts for selecting items and using actions
// fix specifying inputs by clicking
// make synonyms available? or some other way of implicitly representing a lot of stuff

// big

// abstract out the anagram state and then allow there to be multiple widgets (tab between them)
// figure out how to get a bunch of inputs automatically from gpt-3...
// synonym selection