import base64
import requests
import json

mermaid_code = """graph TD
    Start([ເລີ່ມຕົ້ນ]) --> Search[ຄົ້ນຫາວຽກ]
    Search --> Prepare[ກຽມເອກະສານສະໝັກວຽກ <br> Resume, Cover Letter, ໃບປະກາດ...]
    Prepare --> Submit[ສົ່ງໃບສະໝັກ]
    Submit --> Wait[ລໍຖ້າການຕິດຕໍ່ກັບ / ຕິດຕາມຜົນ]
    
    Wait --> Decision1{ໄດ້ຮັບການຕິດຕໍ່<br>ສຳພາດບໍ່?}
    
    Decision1 -- "ໄດ້ຮັບ" --> Interview[ເຂົ້າຮ່ວມການສຳພາດ]
    Decision1 -- "ບໍ່ໄດ້ຮັບ/ງຽບຫາຍ" --> FollowUp[ຕິດຕໍ່ສອບຖາມຜົນ <br> ຜ່ານທາງອີເມວ ຫຼື ໂທລະສັບ]
    
    FollowUp --> Decision2{ຖືກປະຕິເສດ ຫຼື<br>ບໍ່ມີການຕອບກັບ?}
    Decision2 -- "ແມ່ນ" --> Review[ທົບທວນຄືນຂໍ້ບົກຜ່ອງ<br>ແລະ ປັບປຸງເອກະສານໃໝ່]
    Review --> Search
    Decision2 -- "ບໍລິສັດຂໍເວລາພິຈາລະນາເພີ່ມ" --> Wait
    
    Interview --> Decision3{ຜ່ານການສຳພາດບໍ່?}
    Decision3 -- "ຜ່ານ" --> Offer[ໄດ້ຮັບການສະເໜີວຽກ<br>ແລະ ເຊັນສັນຍາ]
    Decision3 -- "ບໍ່ຜ່ານ" --> Review
    
    Offer --> End([ສິ້ນສຸດ: ໄດ້ຮັບວຽກໃໝ່!])

    classDef startEnd fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px;
    classDef process fill:#bbdefb,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#ffe082,stroke:#ff8f00,stroke-width:2px;
    
    class Start,End startEnd;
    class Search,Prepare,Submit,Wait,Interview,FollowUp,Review,Offer process;
    class Decision1,Decision2,Decision3 decision;
"""

state = {
    "code": mermaid_code,
    "mermaid": "{\n  \"theme\": \"default\"\n}",
    "autoSync": True,
    "updateDiagram": True
}

encoded_string = base64.b64encode(json.dumps(state).encode('utf-8')).decode('utf-8')
url = f"https://mermaid.ink/img/{encoded_string}"

try:
    print(f"Requesting URL: {url[:100]}...")
    response = requests.get(url)
    response.raise_for_status()
    with open("job_application_flowchart.png", "wb") as f:
        f.write(response.content)
    print("Successfully saved image to job_application_flowchart.png")
except Exception as e:
    print(f"Failed to fetch image: {e}")
    # try direct base64
    encoded_direct = base64.b64encode(mermaid_code.encode('utf-8')).decode('utf-8')
    url2 = f"https://mermaid.ink/img/{encoded_direct}"
    print(f"Trying direct URL: {url2[:100]}...")
    try:
        response2 = requests.get(url2)
        response2.raise_for_status()
        with open("job_application_flowchart.png", "wb") as f:
            f.write(response2.content)
        print("Successfully saved image to job_application_flowchart.png with direct base64")
    except Exception as e2:
        print(f"Failed again: {e2}")
