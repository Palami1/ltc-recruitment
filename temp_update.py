import re

# Read user_input from temp_update.py or directly parse server/form20Schema.js (but since it has double ]] I'll fix it)
with open('server/form20Schema.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the double ]]
if '  ]\n  ]\n};' in content:
    content = content.replace('  ]\n  ]\n};', '  ]\n};')
elif '  ]\n  ]' in content:
    content = content.replace('  ]\n  ]\n', '  ]\n')

with open('server/form20Schema.js', 'w', encoding='utf-8') as f:
    f.write(content)

# Now extract correctly using \bx:
match = re.search(r'fields:\s*\[(.*?)\]\s*\}', content, re.DOTALL)
server_fields_str = match.group(1)
server_fields = []
for line in server_fields_str.strip().split('\n'):
    line = line.strip()
    if not line: continue
    if line.endswith(','): line = line[:-1]
    
    id_match = re.search(r'\bid:\s*\'([^\']+)\'', line)
    type_match = re.search(r'\btype:\s*\'([^\']+)\'', line)
    x_match = re.search(r'\bx:\s*([\d\.-]+)', line)
    y_match = re.search(r'\by:\s*([\d\.-]+)', line)
    page_match = re.search(r'\bpageIndex:\s*([\d]+)', line)
    
    if id_match:
        server_fields.append({
            'id': id_match.group(1),
            'type': type_match.group(1) if type_match else 'text',
            'x': float(x_match.group(1)) if x_match else 0,
            'y': float(y_match.group(1)) if y_match else 0,
            'pageIndex': int(page_match.group(1)) if page_match else 0
        })

# Fix client/src/lib/form20Schema.ts
with open('client/src/lib/form20Schema.ts', 'r', encoding='utf-8') as f:
    client_content = f.read()

match = re.search(r'fields:\s*\[(.*?)\]\s*\}', client_content, re.DOTALL)
client_fields_str = match.group(1)

client_fields_map = {}
for line in client_fields_str.strip().split('\n'):
    line = line.strip()
    if not line: continue
    id_match = re.search(r'\bid:\s*\'([^\']+)\'', line)
    if id_match:
        client_fields_map[id_match.group(1)] = line

new_lines = []
for sf in server_fields:
    fid = sf['id']
    if fid in client_fields_map:
        cline = client_fields_map[fid]
        cline = re.sub(r'\bx:\s*[\d\.-]+', 'x: ' + str(int(sf['x'])), cline)
        cline = re.sub(r'\by:\s*[\d\.-]+', 'y: ' + str(int(sf['y'])), cline)
        cline = re.sub(r'\bpageIndex:\s*[\d]+', 'pageIndex: ' + str(sf['pageIndex']), cline)
        new_lines.append('    ' + cline)
    else:
        # Shouldn't hit this since we already added them, but just in case
        section = '8. ທັກສະຄອມພິວເຕີ' if fid.startswith('com_') else ('9. ຄວາມສາມາດທາງດ້ານພາສາ' if fid.startswith('lang_') else 'ອື່ນໆ')
        label = fid
        if fid == 'com_others_name': label = 'ໂປຣແກຣມອື່ນໆ (ລະບຸ)'
        elif fid == 'lang_others_name': label = 'ພາສາອື່ນໆ (ລະບຸ)'
        else:
            label = fid.replace('_', ' ').title()
        
        new_lines.append(f"    {{ id: '{fid}', type: '{sf['type']}', label: '{label}', pageIndex: {sf['pageIndex']}, x: {int(sf['x'])}, y: {int(sf['y'])}, section: '{section}' }},")

for i in range(len(new_lines)):
    if not new_lines[i].endswith(','):
        new_lines[i] += ','
if new_lines:
    new_lines[-1] = new_lines[-1].rstrip(',')

new_fields_str = '\n'.join(new_lines)
new_client_content = client_content[:match.start(1)] + '\n' + new_fields_str + '\n  ' + client_content[match.end(1):]

with open('client/src/lib/form20Schema.ts', 'w', encoding='utf-8') as f:
    f.write(new_client_content)

print('Fixed client/src/lib/form20Schema.ts and server/form20Schema.js')
