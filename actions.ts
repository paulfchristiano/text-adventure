const actions:Action[] = [{
    name: 'peel',
    description: 'Peel the banana.',
    subject: ['banana'],
    results: ['peeled banana']
}, {
    name: 'tear',
    description: 'Tear the card to pieces.',
    subject: ['ace of spades', 'two of spades', 'three of spades', 'four of spades', 'five of spades', 'six of spades', 'seven of spades', 'eight of spades', 'nine of spades', 'ten of spades', 'jack of spades', 'queen of spades', 'king of spades'],
    results: ['card scraps']
}, {
    name: 'drink',
    description: 'Drink the rum sour.',
    subject: ['sours', 'sour'],
    results: ['empty glass']
}, {
    name: 'smash',
    description: 'Smash the glass.',
    subject: ['glass'],
    results: ['glass shards']
}, {
    name: 'peel',
    description: 'Peel the lemon.',
    subject: ['lemon'],
    results: ['peeled lemon']
}, {
    name: 'eat',
    description: 'Eat the lemon.',
    subject: ['peeled lemon'],
    results: ['lemon peel']
}]