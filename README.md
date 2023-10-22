# InfiniTime File Explorer

File Explorer for <a href="https://github.com/InfiniTimeOrg/InfiniTime">InfiniTime</a> firmware on PineTime smartwatch

View Live https://infinitimeexplorer.netlify.app/
[![Netlify Status](https://api.netlify.com/api/v1/badges/752c330b-417e-485a-8682-e09610941ece/deploy-status)](https://app.netlify.com/sites/infinitimeexplorer/deploys)

File explorer for InfiniTime external flash, can create and delete directories, delete and upload files.
Also can be used to upload a resource file (.res or .zip), the resource file can have directories and files to be uploaded/created on the PineTime.

Tested on Google Chrome, Windows and Android, on the Android some times you need to hit "Reload" to work.


<img src="doc/explorer_1.jpg" />
<img src="doc/explorer_2.jpg" />


In the resource mode, you can select what files you want to upload.
<img src="doc/explorer_3.jpg" />

More info about the resource file soon in my InfiniTime fork

https://github.com/joaquimorg/PinetimeLite/tree/app_list/resources

<img src="doc/infinitime.jpg" />

---

## Project setup
```
npm install
```
### Compiles and hot-reloads for development
```
npm run serve
```
### Compiles and minifies for production
```
npm run build
```
