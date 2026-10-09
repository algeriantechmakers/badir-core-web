# [1.5.0](https://github.com/algeriantechmakers/badir-core-web/compare/1.4.0...1.5.0) (2026-10-09)


### Features

* switch local storage manager from minio to rustfs ([3a34528](https://github.com/algeriantechmakers/badir-core-web/commit/3a345287b69148acaa451e6eba93d6fceb22b692))

# [1.4.0](https://github.com/algeriantechmakers/badir-core-web/compare/1.3.0...1.4.0) (2026-10-01)

### Bug Fixes

- add organization.is_verified column ([08f1fd7](https://github.com/algeriantechmakers/badir-core-web/commit/08f1fd7733f53a03e4fab42d62ffec2a35f2546a))
- allow the local storage fetching ([9bb0c63](https://github.com/algeriantechmakers/badir-core-web/commit/9bb0c636405ab7046e22078e33d2fda82652677e))
- always show clear filters button on initiatives list ([253f497](https://github.com/algeriantechmakers/badir-core-web/commit/253f4976374aff4287705aba8081ac648dcc1cdd))
- change postgres volume path ([495a457](https://github.com/algeriantechmakers/badir-core-web/commit/495a457c7b6b1d185c652378781ca2b0c0206027))
- clear button icon, placement and disabled state ([882ec63](https://github.com/algeriantechmakers/badir-core-web/commit/882ec6317a79c9d537f5ed6a81adf8d91e54d98b))
- **docker:** stub env vars in builder so next build can collect routes ([d627fd3](https://github.com/algeriantechmakers/badir-core-web/commit/d627fd3690575322bceda3b941ab799b446cb2e8))
- fixed sanitization vunerabilties during initiative creation; fix: fixed easy bruteforce ([041723c](https://github.com/algeriantechmakers/badir-core-web/commit/041723c6685a40519dc04e7face3f103c4e86e0c))
- included self initiatives in joined list ([bb31fd1](https://github.com/algeriantechmakers/badir-core-web/commit/bb31fd16f148a22838da4daa19fe31ddd5c6bf63))
- make it possible to execute npx prisma db seed ([cf8db4e](https://github.com/algeriantechmakers/badir-core-web/commit/cf8db4eca7a70f6deddfdfbd213dbfeb5f4d23b8))
- protect joined initiatives route in auth proxy ([b47497a](https://github.com/algeriantechmakers/badir-core-web/commit/b47497abc4686d00bb092251609aaa9291e81a48))
- **proxy:** allow /api/health and /api/cron through the auth gate ([8ac203a](https://github.com/algeriantechmakers/badir-core-web/commit/8ac203af0c183be257001eca3b87199d120cdf33))
- refatcored PostEditor component and fixed XSS vuln associated with it ([9bb53aa](https://github.com/algeriantechmakers/badir-core-web/commit/9bb53aa3e02a1ceee1be27cbc6f8d95b97656512))
- rename and reposition joined initiatives back button ([a97f688](https://github.com/algeriantechmakers/badir-core-web/commit/a97f68805ffca33cd177a4891113518458b4064c))
- render joined page filters on a single line ([3e0871f](https://github.com/algeriantechmakers/badir-core-web/commit/3e0871f96136e462047a79f71cee7ffb3625e4d3))
- type-checked where clause in joined participations service ([472fb37](https://github.com/algeriantechmakers/badir-core-web/commit/472fb370b93d09532bcb7dac2bbd85f4b05dd11b))
- **types:** resolve two pre-existing type errors ([546877a](https://github.com/algeriantechmakers/badir-core-web/commit/546877abaf0aece9c1ded86e521ef0ed4a7509bf))

### Features

- add clear filters button to initiatives list ([e6bf496](https://github.com/algeriantechmakers/badir-core-web/commit/e6bf49621d011e5438ccac949eef69b02b1ccfee))
- add Dockerfile and docker-compose for portable deployment ([cc41c82](https://github.com/algeriantechmakers/badir-core-web/commit/cc41c821d7f5d664b394171e1a80d4afdf41422c))
- add full filter set to joined initiatives page ([283fc2f](https://github.com/algeriantechmakers/badir-core-web/commit/283fc2f8f52d090be9ee25961234c7b83ce2c684))
- add joined initiatives link to profile dropdown ([7a4881a](https://github.com/algeriantechmakers/badir-core-web/commit/7a4881ab5f1a13372c0e2c708002f8871cb3cfc4))
- add joined initiatives page ([9ea63c1](https://github.com/algeriantechmakers/badir-core-web/commit/9ea63c16b6bd74d839a08e53e73505e6e75c48a4))
- add joined participations service and API route ([8da62a5](https://github.com/algeriantechmakers/badir-core-web/commit/8da62a531cfce37ffc1df4be7d9be657b5cc68d7))
- add participation status filter options ([0b178a2](https://github.com/algeriantechmakers/badir-core-web/commit/0b178a2a1a07f12887734afb6ad0aa17399dd3c9))
- publish sibling -migrator image for the dedicated compose migrate service ([f3f5ac2](https://github.com/algeriantechmakers/badir-core-web/commit/f3f5ac20c3b8e57fed66b1a6aa70feee1ae5944c))
- **rate-limit:** replace Upstash with the stack's own Redis ([ca834ae](https://github.com/algeriantechmakers/badir-core-web/commit/ca834aea20cceac93ed4977b1a4c4c9e61ea8e76))
- switch email provider from Resend to AWS SMTP ([3788de4](https://github.com/algeriantechmakers/badir-core-web/commit/3788de42212e0df8973edf8a608cf58fa307549b))
- switch email provider from Resend to AWS SMTP ([3b15af0](https://github.com/algeriantechmakers/badir-core-web/commit/3b15af0f11ec693b4f8b220a0ce69bbc80d6dce5))
- update Quick Start section in README.md file ([ede66d8](https://github.com/algeriantechmakers/badir-core-web/commit/ede66d8e0615ab7d1a85952a438d4d82e9ac3201))
