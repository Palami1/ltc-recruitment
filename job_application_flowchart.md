# ຂະບວນການສະໝັກວຽກ (Job Application Flowchart)

ນີ້ແມ່ນແຜນວາດ (Flowchart) ທີ່ສະແດງເຖິງຂັ້ນຕອນຕ່າງໆໃນການສະໝັກວຽກ ຕັ້ງແຕ່ເລີ່ມຕົ້ນຈົນເຖິງຂັ້ນຕອນການຕັດສິນໃຈຕ່າງໆ. ສາມາດເບິ່ງໄດ້ໂດຍໃຊ້ເຄື່ອງມືທີ່ຮອງຮັບ Mermaid Diagram (ເຊັ່ນ: GitHub, ຫຼື Extension ໃນ VS Code).

```mermaid
graph TD
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
```
