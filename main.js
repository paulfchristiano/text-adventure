var wordbits;
var bankbits;
var score;
var giveups;
var secretWord;
var guesses
var minlength;
var maxlength;
var timeAdjustmentRule;
var baseTimeLimit;
var timer;
var useTimer;
var timeRemaining;
var dictionaryName;
var timeAddedThreshold;
var bonusTimeText;
var paused;
var lastWord;

// TODO
//
// List words that stumped you
// Provide definition for words?
// Improve word list

function randomWord(minLength, maxLength) {
    maxLength = Math.max(minLength, maxLength)
    dictionary = getSelectedDictionary()
    while (true) {
        var n = Math.floor(Math.random() * dictionary.length)
        var word = dictionary[n]
        if (word.length >= minLength && word.length <= maxLength) {
            return word
        }
    }
}

function heartbeat() {
    if (useTimer && !paused) {
        timeRemaining -= 1
        if (timeRemaining <= 0) {
            giveUp()
            refresh()
        }
        showTime()
    }
}

function getSelectedDictionary() {
    if (dictionaryName  == '10k') {
        return smallDictionary
    } else if (dictionaryName == '50k') {
        return dictionary
    } else if (dictionaryName == 'all') {
        return bigDictionary
    }
    console.log("didn't find dictionary with name " + dictionaryName)
}

function baseTimeLimit() {
    return 
}

function getTimeLimit() {
    var diff =  secretWord.length - minlength;
    if (timeAdjustmentRule[0] == "+") {
        var adjustment = Number(timeAdjustmentRule.substring(1)) * diff
        return baseTimeLimit + adjustment
    } else if (timeAdjustmentRule[0] == "x") {
        var multiple = Math.pow(Number(timeAdjustmentRule.substring(1)), diff)
        return baseTimeLimit * multiple
    } else {
        return baseTimeLimit
    }
}

function randomBank() {
    secretWord = randomWord(minlength, maxlength)
    bankbits = secretWord.split('')
}

function scrambleBank() {
    scramble(bankbits)
}

function isWord(word) {
    return dictionarySet.has(word)
}

function scramble(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      var randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      var temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
}

function strFromKey(e) {
    return String.fromCharCode(e.keyCode)
}

function refresh() {
    if (paused) {
        $('#source').text('(Enter to start)')
        $('#source').css('font-family', 'Times New Roman')
    } else {
        $('#source').text(bankbits.join(''))
        $('#source').css('font-family', 'monospace')
    }
    $('#word').text(wordbits.join(''))
    $('#score').text(score)
    $('#lastword').text(lastWord)
    $('#giveups').text(giveups)
    $('#guesses').text(guesses.join(' '))
    $('#trophies').text(trophies.join(' '))
    showTime()
}

function deleteLetter() {
    if (wordbits.length > 0) {
        bankbits.push(wordbits.pop())
    }
}

function deleteFromFront() {
    bankbits.push(wordbits.shift())
}

function deleteAll() {
    while (wordbits.length > 0) deleteFromFront()
}

function addLetterIfIn(letter) {
    var n = bankbits.indexOf(letter)
    if (n >= 0) {
        bankbits.splice(n, 1)
        wordbits.push(letter)
    }
}

function currentWord() {
    return wordbits.join('')
}

function showTime() {
    $('#time').css('color', 'black')
    if (paused) {
        $('#time').text('')
    } else if (useTimer) {
        if (timeRemaining < 10) {
            $('#time').css('color', 'red')
        }
        $('#time').text(timeRemaining)
    } else {
        $('#time').text('(off)')
    }
    if (bonusTimeText > 0) {
        $('#bonustime').text('(+' + bonusTimeText + ')')
        $('#bonustime').css('color', 'green')
    } else {
        $('#bonustime').text('')
    }
}

function winner() {
    return (bankbits.length == 0) && isWord(currentWord())
}

function giveUp() {
    giveups += 1
    bonusTimeText = 0
    initialize()
}

function addWord() {
    if (guesses.indexOf(currentWord()) == -1) {
        guesses.push(currentWord())
        var bonusTime = Math.max(0, currentWord().length - timeAddedThreshold)
        timeRemaining += bonusTime
        bonusTimeText = bonusTime
        showTime()
    }
}

function reset(){
    score = 0
    giveups = 0
    trophies = []
    secretWord = ""

    timeAdjustmentRule = $('input[name=timeadjustment]:checked').val()
    useTimer = $('input[name=usetimer]:checked').length > 0
    baseTimeLimit = parseInt($('input[name=timelimit]:checked').val())
    minlength = parseInt($('input[name=minlength]:checked').val())
    maxlength = parseInt($('input[name=maxlength]:checked').val())
    dictionaryName = $('input[name=dictionary]:checked').val()
    timeAddedThreshold = parseInt($('input[name=timeaddition]:checked').val())

    initialize()
}

function initialize() {
    wordbits = []
    paused = true
    lastWord = secretWord
    randomBank()
    scrambleBank()
    guesses = []
    timeRemaining = getTimeLimit()
    refresh()
}


function load() {
    setInterval(heartbeat, 1000)
    reset()
    $(document).keydown(e => {
        bonusTimeText = 0
        if (paused) {
            if (e.keyCode == 13) {
                paused = false
            }
        } else if (e.keyCode == 13){
            if (winner()) {
                score += 1
                trophies.push(currentWord())
                initialize()
            } else if (isWord(currentWord())) {
                addWord(currentWord())
                deleteAll()
            } else {
                deleteAll()
            }
        } else if (e.keyCode == 8) {
            deleteLetter()
        } else if (e.keyCode == 32) {
            scrambleBank()
            e.preventDefault()
        } else if (e.keyCode == 27) {
            giveUp()
        } else {
            addLetterIfIn(strFromKey(e))
        }
        refresh()
    })
}
