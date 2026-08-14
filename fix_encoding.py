import os

file_path = 'client/src/components/Form20Tables.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Encode the string to bytes using windows-1252 (which maps the mojibake chars to original bytes)
try:
    original_bytes = content.encode('cp1252')
    # Decode the bytes using utf-8 to get the proper Lao characters
    fixed_content = original_bytes.decode('utf-8')
    
    if 'ພາສາ' in fixed_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print('Successfully fixed encoding using cp1252!')
    else:
        print('Failed to fix: "ພາສາ" not found in decoded content.')
except Exception as e:
    print('Error:', e)
