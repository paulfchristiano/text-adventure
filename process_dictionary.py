def words_in(fname):
    with open(fname) as f:
        return [x[:-1] for x in f]

def make_fname(s):
    return f'/Users/paulfchristiano/Downloads/{s}'

def get_wiki():
    return words_in(make_fname('wiki.txt'))

def get_scrabble():
    return words_in(make_fname('scrabble.txt'))

def get_intersection():
    scrabble_words = set(get_scrabble())
    return [x.upper() for x in get_wiki() if x.islower() and x.upper() in scrabble_words]

def write_words(words, fname):
    with open(fname, 'w') as f:
         f.write('[\n')
         for word in words:
             f.write(f'"{word}",\n')
         f.write(']\n')
