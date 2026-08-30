# vendor\ â€” the prototype sources, copied in

Written by `vendorize.ps1` on 2026-08-30 14:25. Do not edit anything in here: it is a copy, and the next
`vendorize.ps1 -Go -Refresh` overwrites it.

    core             <- D:\CIMEgypt\COTS_Claude\COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src
    shared           <- D:\CIMEgypt\COTS_Claude\COTS_SharedModules_Mockups_Walkthroughs\react\src
    export           <- D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src
    export-portable  <- D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\portable\COTS Export Mock-up.html

`vite.config.ts` and `tsconfig.json` look here first, which is what lets this project be copied
anywhere on its own. Delete this folder and they fall back to the sibling prototype folders.

To change one of the prototypes, change it in its own folder above and re-run

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh
