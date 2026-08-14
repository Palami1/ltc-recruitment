import os

file_path = 'client/src/components/Form20Tables.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Manual mapping to reverse Windows-1252 mojibake
# If a character is <= 0xFF, it maps directly, except for the 1252 overrides.
# The overrides are:
cp1252_to_bytes = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
    0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
    0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
    0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
}

recovered_bytes = bytearray()
for c in content:
    code = ord(c)
    if code in cp1252_to_bytes:
        recovered_bytes.append(cp1252_to_bytes[code])
    elif code <= 0xFF:
        recovered_bytes.append(code)
    else:
        # If there are other characters (like actual UTF-8 characters that weren't corrupted),
        # we can encode them as utf-8 and append. But ideally the whole file is just corrupted.
        recovered_bytes.extend(c.encode('utf-8'))

try:
    fixed_content = recovered_bytes.decode('utf-8')
    if 'ພາສາ' in fixed_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print('Successfully fixed encoding!')
    else:
        print('Failed to fix: "ພາສາ" not found in decoded content. Found instead:')
        print(fixed_content[:100])
except Exception as e:
    print('Error decoding recovered bytes:', e)
