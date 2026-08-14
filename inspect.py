import os

file_path = 'client/src/components/Form20Tables.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Get the first occurrence of 'àºž' and print the character codes around it
idx = content.find('àºž')
if idx != -1:
    snippet = content[idx:idx+20]
    print("Snippet:", snippet)
    print("Codes:", [hex(ord(c)) for c in snippet])
else:
    print("Not found")
