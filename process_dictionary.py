import re

def words_in(fname):
    with open(fname) as f:
        return [x[:-1] for x in f]

def make_fname(s):
    return f'/Users/paulfchristiano/Downloads/{s}'

def get_wiki():
    return words_in(make_fname('wiki.txt'))

def get_scrabble():
    return words_in(make_fname('scrabble.txt'))

def get_intersection(words=None):
    if words is None:
        words = get_wiki()
    scrabble_words = set(get_scrabble())
    return [x.upper() for x in words if x.islower() and x.upper() in scrabble_words]

def write_words(words, fname):
    with open(fname, 'w') as f:
         f.write('[\n')
         for word in words:
             f.write(f'"{word}",\n')
         f.write(']\n')

def pull_titles(fname):
    with open(fname, 'r') as f:
        for line in f:
            for match in re.findall(r'title="[a-z]*"', line):
                yield match[7:-1]

def pull_all_titles():
    for i in range(1, 11):
        yield from pull_titles(f"words{i}.html")
