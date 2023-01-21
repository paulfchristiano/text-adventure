type uid = string;

type Item = {
    description: string;
    name: string;
    subname: string;
    id: uid;
}

type Memory = {
    [name: string]: Item[];
}

const itemsByID:{[id:string]:Item} = {}; //index is uid
const defaultByName:{[name:string]:Item} = {};
const memory:{[name:string]:Item[]} = {};

function initializeItems(items:Item[]) {
    for (let item of items) {
        items[item.id] = item;
        if (defaultByName[item.name] === undefined) defaultByName[item.name] = item;
    }
}

type Action = {
    subject: uid;
    object?: uid;
    name: string;
    description: string;
    results: Item[];
}

const inventory:Item[] = [];

type GameState = {
    inventory: Item[];
    memory: Memory;
    previous: GameState | null;
}

type UIState = {
    state: GameState;
    bankState: BankState;
    targeting?: [Item, Action]
}

type BankState = {
    selected: number[]; // which items from the inventory are selected
    bankLetters: string;
    words: string[];
}

function render(item: Item): string {
    return `${item.name.toUpperCase()} (${item.subname.toUpperCase()})`;
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

function takeAction(state:GameState, action:Action, subject:number, object?:number): GameState {
    const newInventory = state.inventory.slice();
    const toRemove: number[] = [subject];
    if (object != undefined) toRemove.push(object);
    const toAdd: Item[] = action.results;
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

function freshUI(state:GameState): UIState {
    return {state: state, bankState: {selected: [], bankLetters: "", words: []}};
}