// Fixed selected inventory independently verified against pinned GitHub trees.
const pins = {
  "crystal": {
    "sourceCommit": "45b46bf7df3a60b32583291f577a36bf19d22f00",
    "sourceRepository": "https://github.com/pipavlo82/crystal-receipt",
    "files": {
      "vendor/crystal/LICENSE": {
        "sha256": "fa7fe2e14249d2da31c0d2a0bbefc17a1994a93b42ae652a3dab450b6f1c0251",
        "gitBlobSha1": "9b85a39db99de06afeaf7ccae22a25fb2ac8f19f",
        "size": 10377,
        "sourcePath": "LICENSE"
      },
      "vendor/crystal/src/receiptos/canon/canonicalize.ts": {
        "sha256": "fca18d1642e6fe47d26ae2eb9f4bf15cf305653d6a7a08a5a0a09e2d6a716c81",
        "gitBlobSha1": "fb4a037a6dedad4c8d1555db649bb9fce529e01e",
        "size": 491,
        "sourcePath": "src/receiptos/canon/canonicalize.ts"
      },
      "vendor/crystal/src/receiptos/canon/receipt-root.ts": {
        "sha256": "519e532b155f3c1f4720337d09bc2a8503e4546682695e798b8597ad8d187bf0",
        "gitBlobSha1": "4dddf737b824cae91281a93eb563c9134cdc1bb0",
        "size": 803,
        "sourcePath": "src/receiptos/canon/receipt-root.ts"
      },
      "vendor/crystal/src/receiptos/schema/types.ts": {
        "sha256": "0ceead0ed3c1ee307ee409b44542640fc89ed5a532e45f8f67abcf7fcbe491df",
        "gitBlobSha1": "c352a702a8ae55b953b740dcb3c37b99cac31cf3",
        "size": 3570,
        "sourcePath": "src/receiptos/schema/types.ts"
      },
      "vendor/crystal/src/receiptos/verify/verify-receipt.ts": {
        "sha256": "70dad3a005e0d09af6d3b4def8ab4c98e24d3ee9f19839d88894c42c5ac9da04",
        "gitBlobSha1": "2e2e45bf30529de93eac58a04465f17ef81edeaa",
        "size": 1110,
        "sourcePath": "src/receiptos/verify/verify-receipt.ts"
      }
    }
  },
  "rvr": {
    "sourceCommit": "9dd36e882dd372f264b77b179130948aa5adcbde",
    "sourceRepository": "https://github.com/pipavlo82/recomputable-verification-receipts",
    "files": {
      "vendor/rvr/LICENSE": {
        "sha256": "fa7fe2e14249d2da31c0d2a0bbefc17a1994a93b42ae652a3dab450b6f1c0251",
        "gitBlobSha1": "9b85a39db99de06afeaf7ccae22a25fb2ac8f19f",
        "size": 10377,
        "sourcePath": "LICENSE"
      },
      "vendor/rvr/conformance/rvr-v0/adapter.py": {
        "sha256": "03505efc8ee993f118fad2c71f706870d25de0da61a393a1f18f7b310bded235",
        "gitBlobSha1": "b0dfb0d389cbd6b634fef1c965a1b4077bca326e",
        "size": 50109,
        "sourcePath": "conformance/rvr-v0/adapter.py"
      },
      "vendor/rvr/conformance/rvr-v0/verification-profile.json": {
        "sha256": "23cac7eb86aca7a8cc0422985f598b67dd3fe758bd2321f6bcbc5ab2f1c2d8ab",
        "gitBlobSha1": "85aa57b928d35fa969fa23676b85716a763ee66b",
        "size": 4484,
        "sourcePath": "conformance/rvr-v0/verification-profile.json"
      },
      "vendor/rvr/conformance/rvr-v0/verification-profile-manifest.schema.json": {
        "sha256": "148afeb484d3866c1caae82e574182c1b748dd461dfaeb1d8095ecf4905690c1",
        "gitBlobSha1": "1525538d1c0316c2c5fc2e0ff2c7e8b4731d3169",
        "size": 6479,
        "sourcePath": "conformance/rvr-v0/verification-profile-manifest.schema.json"
      },
      "vendor/rvr/conformance/rvr-v0/rvr-generic-sha256-equals-v0.profile.schema.json": {
        "sha256": "ecded96c5f58f7057e2c5c0b6d9789942a9a7bf600f4a453387e99f8406e7baf",
        "gitBlobSha1": "86e2045fca20f52d0649323670dc5945c7d85460",
        "size": 2849,
        "sourcePath": "conformance/rvr-v0/rvr-generic-sha256-equals-v0.profile.schema.json"
      },
      "vendor/rvr/conformance/rvr-v0/rvr.schema.json": {
        "sha256": "97799403d8eb96c046930396c39e0f1c3e76d6c35fd0435937446ce844bd4dae",
        "gitBlobSha1": "6ee92d50ef2ed50bb9508c5ddc15d7950fbdb852",
        "size": 3883,
        "sourcePath": "conformance/rvr-v0/rvr.schema.json"
      },
      "vendor/rvr/conformance/rvr-v0/expected.json": {
        "sha256": "0ed23ee3530df93dde2f879981d28ddb3f60fc250c8652d109dd65fdb22193ce",
        "gitBlobSha1": "53adbb9d53ab050693ef5ef9681bf73858d1443c",
        "size": 3176,
        "sourcePath": "conformance/rvr-v0/expected.json"
      },
      "vendor/rvr/conformance/rvr-v0/mutants.json": {
        "sha256": "d5d16cc53ec0d9be53968d7ffc01fe019cb8b2630390c04431f6ee9f54edf847",
        "gitBlobSha1": "eed6c3ee0c1a8f002a9f25675dbfeae463775888",
        "size": 1624,
        "sourcePath": "conformance/rvr-v0/mutants.json"
      },
      "vendor/rvr/conformance/rvr-v0/vectors.json": {
        "sha256": "170fc62576fa8edb22073f73b28d9ac0deff26451ef651378839cd458da7312f",
        "gitBlobSha1": "ba1dd37684d4f345a43664617b318271465f2da6",
        "size": 6641,
        "sourcePath": "conformance/rvr-v0/vectors.json"
      },
      "vendor/rvr/docs/spec/RECOMPUTABLE_VERIFICATION_RECEIPTS_V0.md": {
        "sha256": "81077ddbf50624bc70941cf53a4f542604e926a653d7fcb3a36310ff5430b973",
        "gitBlobSha1": "8bd2ae2962d0151998cdf3244e8cc2317215c742",
        "size": 13294,
        "sourcePath": "docs/spec/RECOMPUTABLE_VERIFICATION_RECEIPTS_V0.md"
      }
    }
  },
  "qev": {
    "sourceCommit": "5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05",
    "sourceRepository": "https://github.com/pipavlo82/quantum-execution-evidence",
    "files": {
      "vendor/qev/LICENSE": {
        "sha256": "fa7fe2e14249d2da31c0d2a0bbefc17a1994a93b42ae652a3dab450b6f1c0251",
        "gitBlobSha1": "9b85a39db99de06afeaf7ccae22a25fb2ac8f19f",
        "size": 10377,
        "sourcePath": "LICENSE"
      },
      "vendor/qev/NOTICE": {
        "sha256": "19e374f11c3a1312b7838acf89cabe2b08ee133f39f63706d5013dd9d50bf43a",
        "gitBlobSha1": "c0e543cb4281ef24c257a1138afdda4132aa4db8",
        "size": 478,
        "sourcePath": "NOTICE"
      },
      "vendor/qev/qev/__init__.py": {
        "sha256": "92b1dfb8965a5b874587727aaf58da03e130b3d861b93ab08292d5ca126908c7",
        "gitBlobSha1": "b250517954c9171a2abdaa69ab0e40786e4c5824",
        "size": 81,
        "sourcePath": "qev/__init__.py"
      },
      "vendor/qev/qev/checker.py": {
        "sha256": "933da623da9c6ae5534da243f8e4299dd8595f759c1b971d6467c3cce0e63a25",
        "gitBlobSha1": "e4dc30440cbb081c660b4256a374dbf6389527a6",
        "size": 16121,
        "sourcePath": "qev/checker.py"
      },
      "vendor/qev/qev/adapters.py": {
        "sha256": "b5a881dee92d1b1e880ed38a966fde4784efe09295cf4010d4f859c31edd2802",
        "gitBlobSha1": "012d1065cad9e9adb6b36d7c25fcefdc89e103da",
        "size": 3152,
        "sourcePath": "qev/adapters.py"
      },
      "vendor/qev/qev/source_inventory.py": {
        "sha256": "1fe1e86435513e040ad26d10d1ba7997a1df984d7fd5af3a3a7fe748f0a73478",
        "gitBlobSha1": "4e07de9da89e465c4e8a4f49951e8eac287c748c",
        "size": 21442,
        "sourcePath": "qev/source_inventory.py"
      },
      "vendor/qev/qev/semantic_link.mjs": {
        "sha256": "78f2fc9fe6d0baa1d5e9c3cb52872487d842053bbab3cd80d28d96f8b6dd4bdd",
        "gitBlobSha1": "3ecf0060f2b8012fdb8554b9f3f32a8dc20fb320",
        "size": 521,
        "sourcePath": "qev/semantic_link.mjs"
      },
      "vendor/qev/docs/CONTRACT.md": {
        "sha256": "efce937f5ad827122e210ee3ec976915acb3c2afe9201c2d9e5f1a6d2cda3eeb",
        "gitBlobSha1": "65ec92610bc4529bb994616ad25bbf8817a81386",
        "size": 10288,
        "sourcePath": "docs/CONTRACT.md"
      },
      "vendor/qev/vendor/semantic-abi/LICENSE": {
        "sha256": "c95bae1d1ce0235ecccd3560b772ec1efb97f348a79f0fbe0a634f0c2ccefe2c",
        "gitBlobSha1": "57bc88a15a0ee8266c259b2667e64608d3f7e292",
        "size": 11358,
        "sourcePath": "vendor/semantic-abi/LICENSE"
      },
      "vendor/qev/vendor/semantic-abi/schema/LICENSE-CC0.txt": {
        "sha256": "7179683e8000e6bdc9bbc60d85edf0a4ac8e76f951857f54fcb775d5886f1309",
        "gitBlobSha1": "6ca207ef004cb69d03041e7e5c288a2be4968045",
        "size": 7049,
        "sourcePath": "vendor/semantic-abi/schema/LICENSE-CC0.txt"
      },
      "vendor/qev/vendor/semantic-abi/schema/manifest.schema.json": {
        "sha256": "3219f51c7929ff915b71e5931a5d10edc5e15e73809fc2c47107592490bbe397",
        "gitBlobSha1": "647fc36d7d34756119a757d10b94b4473db44aa0",
        "size": 3842,
        "sourcePath": "vendor/semantic-abi/schema/manifest.schema.json"
      },
      "vendor/qev/vendor/semantic-abi/runner/src/linker.mjs": {
        "sha256": "bae8e519361989bfadbb5d226cb9940255cd954c60b40ba42136a2b11161d391",
        "gitBlobSha1": "c292a23ef0f3c283e600522f7a13a42fdceee1d8",
        "size": 4044,
        "sourcePath": "vendor/semantic-abi/runner/src/linker.mjs"
      }
    }
  },
  "qev_moth": {
    "sourceCommit": "5de55f007ab5ce4cf5acb7fe79d7f755ff0fee05",
    "sourceRepository": "https://github.com/pipavlo82/quantum-execution-evidence",
    "files": {
      "vendor/qev_moth/LICENSE": {
        "sha256": "fa7fe2e14249d2da31c0d2a0bbefc17a1994a93b42ae652a3dab450b6f1c0251",
        "gitBlobSha1": "9b85a39db99de06afeaf7ccae22a25fb2ac8f19f",
        "size": 10377,
        "sourcePath": "LICENSE"
      },
      "vendor/qev_moth/NOTICE": {
        "sha256": "19e374f11c3a1312b7838acf89cabe2b08ee133f39f63706d5013dd9d50bf43a",
        "gitBlobSha1": "c0e543cb4281ef24c257a1138afdda4132aa4db8",
        "size": 478,
        "sourcePath": "NOTICE"
      },
      "vendor/qev_moth/docs/MOTH_COUNTS_RVR_V0.md": {
        "sha256": "4813aa8fcecffb98f1322cc6a844902b5d87c37e1ad44bfe29d7550b8cd1332a",
        "gitBlobSha1": "43753088704ce0c304cafad0b51efd01999e3381",
        "size": 8083,
        "sourcePath": "docs/MOTH_COUNTS_RVR_V0.md"
      },
      "vendor/qev_moth/docs/MOTH_RECEIPTOS_V0.md": {
        "sha256": "3032b61be91c0188ecc6dcd542e63d14afca51881f8ee2404201853e413ca876",
        "gitBlobSha1": "466eedb2422ab46c2f3e5879f3a27176e8261f10",
        "size": 8583,
        "sourcePath": "docs/MOTH_RECEIPTOS_V0.md"
      },
      "vendor/qev_moth/profiles/moth-receiptos-v0/conformance.json": {
        "sha256": "aa476480b1b2c6a9daa34ecc91023262625228264bb92f3d88bf24d4b93fb1e7",
        "gitBlobSha1": "4d6748f44583f0cac0cdfc319aa2869ac53ae54d",
        "size": 2239,
        "sourcePath": "profiles/moth-receiptos-v0/conformance.json"
      },
      "vendor/qev_moth/profiles/moth-receiptos-v0/profile.json": {
        "sha256": "ce53536192a820740e3a9a62bf15e15791992024c298bcbef5ec7c28db331184",
        "gitBlobSha1": "5749533f5e6e37c679003b706c85d6274422d2e3",
        "size": 3770,
        "sourcePath": "profiles/moth-receiptos-v0/profile.json"
      },
      "vendor/qev_moth/profiles/moth-receiptos-v0/sources.json": {
        "sha256": "8dd606705cc64197c730fa0ea979c1dd14dfceabc1c9b84d59ba42c78fdec5ad",
        "gitBlobSha1": "b9a18de477715c479171ebfc801f1c4ab75aeb9c",
        "size": 944,
        "sourcePath": "profiles/moth-receiptos-v0/sources.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/claim.json": {
        "sha256": "b6a72e00592211a16c052ab7d76f5da920731dc070c81142d08e5f73b4d9e617",
        "gitBlobSha1": "6414295bf7011b3ddc9f7b11f9f33aa5f2200a96",
        "size": 623,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/claim.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/conformance.json": {
        "sha256": "f5c0086639e626d64a951ac16e83be10ea6eee16fb9165f1118ff5f6209e64c4",
        "gitBlobSha1": "4e56f6626aab87705825c735acc73445ac22fb3f",
        "size": 1422,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/conformance.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/profile.schema.json": {
        "sha256": "3ac39d1015d5d1fa3a7a18f57ba3eb5d8dc4836768799eaa1cef98d104ebc6db",
        "gitBlobSha1": "49adeaa3718a6b7061ad690d3b4c28063f76c6e5",
        "size": 148,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/profile.schema.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/roles.json": {
        "sha256": "9bbe74b0bd2a291acfc1d4d1d55ad4434ec69c6f684e1a464099ba5bfdbea926",
        "gitBlobSha1": "aeba19e1869406f0e7d0ebaa64e2679c738de111",
        "size": 1049,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/roles.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/rvr-moth.schema.json": {
        "sha256": "360e348792e1347ae56cd39a948397be00ce6689391cee7b20ae3684ed0eaa27",
        "gitBlobSha1": "8aa89aa9842ef07a5e89ee7c5115847a831540cd",
        "size": 10722,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/rvr-moth.schema.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/sources.json": {
        "sha256": "11a70a1a122531af347db3fd5fcfaeebdff880570e522aef41d4ea4dcab44008",
        "gitBlobSha1": "475b47eee1826871b620a031908eba7bc041dec3",
        "size": 1417,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/sources.json"
      },
      "vendor/qev_moth/profiles/rvr-qev-moth-counts-v0/verification-profile.json": {
        "sha256": "da71c114b736338ffa198e69b003e872862eed7ad96e8123378a3eeab4f23aec",
        "gitBlobSha1": "9e5eacbad6778daf61d6a6f0d657425ba710c191",
        "size": 7389,
        "sourcePath": "profiles/rvr-qev-moth-counts-v0/verification-profile.json"
      },
      "vendor/qev_moth/qev/__init__.py": {
        "sha256": "92b1dfb8965a5b874587727aaf58da03e130b3d861b93ab08292d5ca126908c7",
        "gitBlobSha1": "b250517954c9171a2abdaa69ab0e40786e4c5824",
        "size": 81,
        "sourcePath": "qev/__init__.py"
      },
      "vendor/qev_moth/qev/adapters.py": {
        "sha256": "b5a881dee92d1b1e880ed38a966fde4784efe09295cf4010d4f859c31edd2802",
        "gitBlobSha1": "012d1065cad9e9adb6b36d7c25fcefdc89e103da",
        "size": 3152,
        "sourcePath": "qev/adapters.py"
      },
      "vendor/qev_moth/qev/admission.py": {
        "sha256": "3450ce9b1381454051a58cc5dc87b266f0f105156cd9131caf84f8091ae181e6",
        "gitBlobSha1": "05b5b559afe5ff46be23e00c938e2b42dd1190ab",
        "size": 6859,
        "sourcePath": "qev/admission.py"
      },
      "vendor/qev_moth/qev/inventory.py": {
        "sha256": "db01cbbb4752c0c37394c373d4df5520180f5804de65da5fbcad88fdfc013424",
        "gitBlobSha1": "9d9ab49e423df1f293551bc219581886516e08fe",
        "size": 11979,
        "sourcePath": "qev/inventory.py"
      },
      "vendor/qev_moth/qev/live_common.py": {
        "sha256": "5b7a551784dbfedb91c1c94a75003cc2cf66be8167e6761cd26751fffd5a6071",
        "gitBlobSha1": "8cb34b55823f2863ee5b92f48f012472b5cdaebb",
        "size": 6097,
        "sourcePath": "qev/live_common.py"
      },
      "vendor/qev_moth/qev/moth_comet.py": {
        "sha256": "76c51c23fb0c56799674a6e93c1e02bf8243e563bdbfa039f98f8798f13d815f",
        "gitBlobSha1": "757d379e0fafcfa992a495ff895f8858e19a8794",
        "size": 15732,
        "sourcePath": "qev/moth_comet.py"
      },
      "vendor/qev_moth/qev/moth_receiptos.py": {
        "sha256": "e874f1710ed9a486929cd6df80a4552fff799e9be46cba32367c64fb42dc7a7c",
        "gitBlobSha1": "7caafeb25ef2f245439eeb36c8975b885f207502",
        "size": 9658,
        "sourcePath": "qev/moth_receiptos.py"
      },
      "vendor/qev_moth/qev/moth_receiptos_bridge.ts": {
        "sha256": "ea508b61416dd3060ab7009ea57fdb580d510c5539acc4921ca83b343766e218",
        "gitBlobSha1": "e778be4e677f5988b5e5c46e8047784019337cfa",
        "size": 1075,
        "sourcePath": "qev/moth_receiptos_bridge.ts"
      },
      "vendor/qev_moth/qev/moth_receiptos_cli.py": {
        "sha256": "55c5d46c93c5db52e4c9a91badd582ddc388980469f028e23a3e3c6a1b26aab0",
        "gitBlobSha1": "767228b9e27a123009f721e84d27e92a6b3e5ff1",
        "size": 2720,
        "sourcePath": "qev/moth_receiptos_cli.py"
      },
      "vendor/qev_moth/qev/moth_receiptos_mutations.py": {
        "sha256": "3c4be8f52d20fb11b17e011a756abf00ccd69eb4b550a1522db42f0344ff514b",
        "gitBlobSha1": "cfb76d1a41024078ad2d3c8b2cd30385db02d613",
        "size": 6071,
        "sourcePath": "qev/moth_receiptos_mutations.py"
      },
      "vendor/qev_moth/qev/moth_replay.py": {
        "sha256": "1bd74334b37da8f982b4eb5c7566ab594fdc6a1410ef80f5966fcf713a91a9f1",
        "gitBlobSha1": "ed446ef72a44d6c1257686ee35016f2977f25213",
        "size": 6473,
        "sourcePath": "qev/moth_replay.py"
      },
      "vendor/qev_moth/qev/moth_rvr.py": {
        "sha256": "9b5f805d23d9ffa452fed2eb022a998ccfe704727b1475fb475636f73d08660e",
        "gitBlobSha1": "b18e9313e6e0d9d69961abe745aecfedd4be0c0c",
        "size": 9656,
        "sourcePath": "qev/moth_rvr.py"
      },
      "vendor/qev_moth/qev/moth_rvr_cli.py": {
        "sha256": "ea4d81391558b5688c90df66fa12599c95ca8207063b86464c3c0717041ddde1",
        "gitBlobSha1": "86ba2491d08b777776291fa76b79190a4f4fa74a",
        "size": 2591,
        "sourcePath": "qev/moth_rvr_cli.py"
      },
      "vendor/qev_moth/qev/moth_rvr_mutations.py": {
        "sha256": "038ecaa224c7b27a82e348dd4d5df81e0f0781ce991e1f1b79fef54fcdc9f150",
        "gitBlobSha1": "ae21495af46ede0ccc22a22870df92613e797687",
        "size": 6190,
        "sourcePath": "qev/moth_rvr_mutations.py"
      },
      "vendor/qev_moth/qev/moth_rvr_relation.py": {
        "sha256": "af78c4940b09f13ed14dac2cd5bc1e5e13949edad578b2b0f4d3dcf07a72fc71",
        "gitBlobSha1": "5d64fb1f6d086ab91022640f98177d74b22461fd",
        "size": 5622,
        "sourcePath": "qev/moth_rvr_relation.py"
      },
      "vendor/qev_moth/qev/source_inventory.py": {
        "sha256": "1fe1e86435513e040ad26d10d1ba7997a1df984d7fd5af3a3a7fe748f0a73478",
        "gitBlobSha1": "4e07de9da89e465c4e8a4f49951e8eac287c748c",
        "size": 21442,
        "sourcePath": "qev/source_inventory.py"
      },
      "vendor/qev_moth/qev/sources.py": {
        "sha256": "f4aeba870302e6207d9c4de0c56fdecebc4c93e47d4dcd08a55db45ca9b64f01",
        "gitBlobSha1": "baee43fabb4c76ab55e584f07d847dd7b08b1311",
        "size": 3816,
        "sourcePath": "qev/sources.py"
      },
      "vendor/qev_moth/tests/test_moth_receiptos.py": {
        "sha256": "3f4483927a063681f67abdaa3252f374c6a227c695490c9478f2ea6d067b0817",
        "gitBlobSha1": "2b45d669dca0e178cd97bc5b1137c41bb16163fe",
        "size": 15062,
        "sourcePath": "tests/test_moth_receiptos.py"
      },
      "vendor/qev_moth/tests/test_moth_rvr.py": {
        "sha256": "63c8914174dca8f471542f08e4b6e5ab0c54ac18848dc67dfa5b0f24179618b8",
        "gitBlobSha1": "6919f49861980d20f3b54a9d323f9b00dc3f0ff4",
        "size": 12423,
        "sourcePath": "tests/test_moth_rvr.py"
      },
      "vendor/qev_moth/tools/pin_moth_receiptos_profile.py": {
        "sha256": "ea455897e79427a05fb87c1018ba6d9c3778a3e350d5382504d3c84c7b1fa9cc",
        "gitBlobSha1": "2e37a19e8e7c5ec74f4f6480c2ba0e6aa0e26285",
        "size": 1121,
        "sourcePath": "tools/pin_moth_receiptos_profile.py"
      },
      "vendor/qev_moth/tools/pin_moth_rvr_profile.py": {
        "sha256": "950e1443b5af83e3dd47cd6d00944a27832018de3eccda4b28a0c1a1029aa35a",
        "gitBlobSha1": "b63a621605aebdd403dcab9e674037ab8cebd622",
        "size": 6009,
        "sourcePath": "tools/pin_moth_rvr_profile.py"
      },
      "vendor/qev_moth/vendor/receiptos-v0/LICENSE": {
        "sha256": "fa7fe2e14249d2da31c0d2a0bbefc17a1994a93b42ae652a3dab450b6f1c0251",
        "gitBlobSha1": "9b85a39db99de06afeaf7ccae22a25fb2ac8f19f",
        "size": 10377,
        "sourcePath": "vendor/receiptos-v0/LICENSE"
      },
      "vendor/qev_moth/vendor/receiptos-v0/schemas/evidence-capsule.v0.schema.json": {
        "sha256": "f8b8c44bffa4d7cb827564cfa663ffe60396b4aa39991762c855a24765c1d159",
        "gitBlobSha1": "b560e2bfd04a39fc0f70ca749e7336e933679169",
        "size": 3890,
        "sourcePath": "vendor/receiptos-v0/schemas/evidence-capsule.v0.schema.json"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/canon/canonicalize.ts": {
        "sha256": "fca18d1642e6fe47d26ae2eb9f4bf15cf305653d6a7a08a5a0a09e2d6a716c81",
        "gitBlobSha1": "fb4a037a6dedad4c8d1555db649bb9fce529e01e",
        "size": 491,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/canon/canonicalize.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/canon/receipt-root.ts": {
        "sha256": "519e532b155f3c1f4720337d09bc2a8503e4546682695e798b8597ad8d187bf0",
        "gitBlobSha1": "4dddf737b824cae91281a93eb563c9134cdc1bb0",
        "size": 803,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/canon/receipt-root.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/capsule/crystal-mapping.ts": {
        "sha256": "9a3f949160d2132778d71fd825d14d4fe96a24b037d80d5bc93fa9b4e34f0d24",
        "gitBlobSha1": "64223eac0425dd36edae7bf94a6373389eb0b5e1",
        "size": 1315,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/capsule/crystal-mapping.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/capsule/evidence-capsule-v0.ts": {
        "sha256": "c024ec49d2a9c58caf5df811e7f89b5e81b9a75b93428c12bcdd39d6656dc6e9",
        "gitBlobSha1": "20b789e2992ab4363bcc361467551d27d5e23183",
        "size": 8898,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/capsule/evidence-capsule-v0.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/capsule/evidence-capsule.ts": {
        "sha256": "d8d7174f5f2491fffe755b7b81dff44c15dfab55d7bfbf9c1cc752b654dd25ca",
        "gitBlobSha1": "79f8214ad13b545fae42c3a82c4b3be9cadd0028",
        "size": 11077,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/capsule/evidence-capsule.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/capsule/portable-proof-object-v0.ts": {
        "sha256": "ac316f865b60fca90339e402545c1d88bc8735ab542b879137ec31948d01d09b",
        "gitBlobSha1": "734df63bb397cf223eb5363a4f941e86fda021b8",
        "size": 4232,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/capsule/portable-proof-object-v0.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/capsule/render-plan.ts": {
        "sha256": "31152a759230998aca3130abbcb48a1dc1c88ee8323a3ce3cc7bedd6e728addf",
        "gitBlobSha1": "ae7b47f4e3545cb30ae8f517db8f37cddb5b5a49",
        "size": 4497,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/capsule/render-plan.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/merkle/local-merkle.ts": {
        "sha256": "4024972dd240b9e6d266b792db45fbfe622ee5fa8ee3425ff6b79a69acad7ba0",
        "gitBlobSha1": "4167afb1f1ee92379f95d46616fabdce224d9937",
        "size": 2111,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/merkle/local-merkle.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/schema/types.ts": {
        "sha256": "0ceead0ed3c1ee307ee409b44542640fc89ed5a532e45f8f67abcf7fcbe491df",
        "gitBlobSha1": "c352a702a8ae55b953b740dcb3c37b99cac31cf3",
        "size": 3570,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/schema/types.ts"
      },
      "vendor/qev_moth/vendor/receiptos-v0/src/receiptos/verify/verify-receipt.ts": {
        "sha256": "70dad3a005e0d09af6d3b4def8ab4c98e24d3ee9f19839d88894c42c5ac9da04",
        "gitBlobSha1": "2e2e45bf30529de93eac58a04465f17ef81edeaa",
        "size": 1110,
        "sourcePath": "vendor/receiptos-v0/src/receiptos/verify/verify-receipt.ts"
      },
      "vendor/qev_moth/vendor/rvr-v0/LICENSE": {
        "sha256": "fa7fe2e14249d2da31c0d2a0bbefc17a1994a93b42ae652a3dab450b6f1c0251",
        "gitBlobSha1": "9b85a39db99de06afeaf7ccae22a25fb2ac8f19f",
        "size": 10377,
        "sourcePath": "vendor/rvr-v0/LICENSE"
      },
      "vendor/qev_moth/vendor/rvr-v0/adapter.py": {
        "sha256": "03505efc8ee993f118fad2c71f706870d25de0da61a393a1f18f7b310bded235",
        "gitBlobSha1": "b0dfb0d389cbd6b634fef1c965a1b4077bca326e",
        "size": 50109,
        "sourcePath": "vendor/rvr-v0/adapter.py"
      },
      "vendor/qev_moth/vendor/rvr-v0/verification-profile-manifest.schema.json": {
        "sha256": "148afeb484d3866c1caae82e574182c1b748dd461dfaeb1d8095ecf4905690c1",
        "gitBlobSha1": "1525538d1c0316c2c5fc2e0ff2c7e8b4731d3169",
        "size": 6479,
        "sourcePath": "vendor/rvr-v0/verification-profile-manifest.schema.json"
      }
    }
  }
};

export function validateSourceManifest(name, source) {
  const expected = pins[name];
  if (!expected || source?.sourceCommit !== expected.sourceCommit || source?.sourceRepository !== expected.sourceRepository) throw new Error("Native source identity mismatch");
  if (!Array.isArray(source.files) || source.files.length !== Object.keys(expected.files).length) throw new Error("Native source inventory must be exact and nonempty");
  const seen = new Set();
  for (const file of source.files) {
    const pin = expected.files[file.vendoredPath];
    if (!pin || seen.has(file.vendoredPath)) throw new Error("Native source inventory path mismatch");
    seen.add(file.vendoredPath);
    if (file.sha256 !== pin.sha256 || file.gitBlobSha1 !== pin.gitBlobSha1 || file.size !== pin.size || file.sourcePath !== pin.sourcePath || file.copiedUnmodified !== true) throw new Error("Native source manifest digest mismatch");
  }
  return source;
}
