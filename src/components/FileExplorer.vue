
<template>
  <div style="margin: 20px">
    <n-card size="huge" title="Infinitime File Explorer">
      <n-space vertical>
        <div></div>
        <n-button type="success" v-if="!isConnected" @click="connectDevice">
          Connect to Infinitime
        </n-button>

        <div v-if="isConnected">
          <n-space vertical size="large">
            <n-card
              title="Device information"
              :bordered="true"
              size="small"
              class="rounded-16px shadow-sm device"
            >
              <n-descriptions
                label-placement="left"
                bordered
                size="small"
                :column="1"
              >
                <n-descriptions-item label="Name">
                  <n-tag type="primary">{{ deviceName }}</n-tag>
                </n-descriptions-item>
                <n-descriptions-item label="FW Version">
                  <n-tag type="primary">{{ deviceVersion }}</n-tag>
                </n-descriptions-item>
                <n-descriptions-item label="BLE FS Version">
                  <n-tag type="primary">{{ fileServiceVersion }}</n-tag>
                </n-descriptions-item>
                <n-descriptions-item>
                  <n-space>
                    <n-button type="error" @click="disconnectDevice">
                      Disconnect
                    </n-button>
                    <n-button type="info" dashed @click="reloadServices">
                      Reload
                    </n-button>
                  </n-space>
                </n-descriptions-item>
              </n-descriptions>
            </n-card>

            <n-card
              v-if="fileServiceReady"
              title="File Explorer"
              :bordered="true"
              size="small"
              class="rounded-16px shadow-sm"
            >
              <n-grid x-gap="12" y-gap="8" cols="1 400:1 800:2">
                <n-gi>
                  <n-space vertical>
                    <n-space>
                      <n-button
                        :disabled="uploadingFile != ''"
                        round
                        type="warning"
                        @click="loadDir('/')"
                      >
                        /
                      </n-button>
                      <n-button
                        v-if="path != '/'"
                        :disabled="uploadingFile != ''"
                        round
                        type="success"
                        @click="loadDir(path)"
                      >
                        <template #icon>
                          <n-icon size="14" :component="Redo" />
                        </template>
                        {{ path }}
                      </n-button>
                      <n-button
                        :disabled="uploadingFile != ''"
                        round
                        type="info"
                        @click="showModal = true"
                      >
                        Make dir
                      </n-button>
                    </n-space>
                    <n-data-table
                      :columns="deviceFileListColumns"
                      :data="deviceFileList"
                      :pagination="false"
                      size="small"
                      :loading="loadingFolder || uploadingFile != ''"
                    />
                  </n-space>
                </n-gi>
                <n-gi>
                  <div v-if="!showUploadList">
                    <n-space>
                      <n-upload :custom-request="resourceUpload" accept=".res">
                        <n-button secondary round type="success">
                          Open resource file
                        </n-button>
                      </n-upload>
                    </n-space>
                    <n-upload
                      ref="uploadRef"
                      :default-upload="false"
                      multiple
                      @change="handleUploadChange"
                      accept=".bin"
                    >
                      <n-upload-dragger>
                        <div style="margin-bottom: 12px">
                          <n-icon size="48" :depth="3">
                            <FileUpload />
                          </n-icon>
                        </div>
                        <n-text style="font-size: 16px">
                          Click or drag a file to this area to upload
                        </n-text>
                      </n-upload-dragger>
                    </n-upload>
                    <n-button
                      :disabled="!fileListLength || uploadingFile != ''"
                      style="margin-bottom: 12px"
                      @click="handleUpload"
                      type="success"
                      round
                    >
                      Upload Files to {{ path }}
                    </n-button>
                  </div>
                  <div v-else>
                    <n-alert title="Upload files" type="success">
                      <template #icon>
                        <n-icon>
                          <FileUpload />
                        </n-icon>
                      </template>
                      <n-space vertical>
                        <n-space>
                          <n-button
                            v-if="uploadingFile == '' && uploadingResFile != ''"
                            style="margin-bottom: 12px"
                            @click="handleUploadRes"
                            type="success"
                            round
                          >
                            Upload Files
                          </n-button>

                          <n-button
                            v-if="uploadingFile == '' && uploadingResFile != ''"
                            style="margin-bottom: 12px"
                            @click="handleUploadResCancel"
                            type="error"
                            round
                          >
                            Cancelar
                          </n-button>
                        </n-space>
                        <div v-if="uploadingFile != ''">
                          <n-progress
                            type="line"
                            status="error"
                            :percentage="uploadingPercentage"
                            :height="24"
                            border-radius="12px 0 12px 0"
                            fill-border-radius="12px 0 12px 0"
                            :show-indicator="false"
                          />
                          <n-space vertical>
                            <div>
                              {{ uploadingFile }}
                            </div>
                            <div>
                              {{ humanFileSize(uploadingSize, true, 2) }} of
                              {{ humanFileSize(uploadingTotalSize, true, 2) }}
                            </div>
                          </n-space>
                        </div>
                        <div v-if="uploadingResFile != ''">
                          Resource file {{ uploadingResFile }}
                        </div>

                        <n-data-table
                          :columns="uploadFileListColumns"
                          :data="fileToTransfer"
                          :pagination="false"
                          size="small"
                          :row-class-name="rowClassName"
                          :row-key="(row) => row.name"
                          :default-checked-row-keys="fileToTransferChecked"
                          @update:checked-row-keys="handlefileToTransferCheck"
                        />
                      </n-space>
                    </n-alert>
                  </div>
                </n-gi>
              </n-grid>
            </n-card>
            <div v-if="!fileServiceReady">
              <n-space justify="center">
                <n-spin size="large" />
              </n-space>
            </div>
          </n-space>
        </div>
      </n-space>
    </n-card>

    <n-modal
      v-model:show="showModal"
      :mask-closable="false"
      preset="dialog"
      title="Make directory"
      content="Are you sure?"
      positive-text="Confirm"
      negative-text="Cancel"
      @positive-click="onDirCreate"
    >
      <div :style="{ maxHeight: '60vh' }">
        <n-scrollbar class="pl-5 pr-5">
          <div>
            <n-input
              v-model:value="dirName"
              type="text"
              placeholder="Directory Name"
            />
          </div>
        </n-scrollbar>
      </div>
    </n-modal>
  </div>
</template>

<style>
.n-card .device {
  max-width: 400px;
}

.pending td,
.pending .n-text {
  color: rgba(0, 255, 255, 1) !important;
}

.uploading td,
.uploading .n-text {
  color: rgba(255, 255, 0, 1) !important;
}

.finished td,
.finished .n-text {
  color: rgba(0, 255, 0, 1) !important;
}

.error td,
.error .n-text {
  color: rgba(255, 0, 0, 1) !important;
}
</style>

<script setup>
import { ref, h } from "vue";

// eslint-disable-next-line no-unused-vars
import { useMessage, NButton, NIcon, NSpace, NText } from "naive-ui";
import { useRenderAction } from "@/components/utils";

// eslint-disable-next-line no-unused-vars
import {
  Redo,
  FileUpload,
  FolderOpen,
  File,
  LevelUpAlt,
  FolderPlus,
} from "@vicons/fa";

import JsZip from "jszip";

const bleDevice = ref(null);
const fileTransfer = ref(null);

const isConnected = ref(false);
const fileServiceReady = ref(false);
const message = useMessage();

const mtuSize = ref(200);

const deviceName = ref("");
const deviceVersion = ref("");
const fileServiceVersion = ref(0);

const dirName = ref("");

const showModal = ref(false);

const path = ref("/");
const loadingFolder = ref(false);
const deviceFileList = ref([]);

const fileListLength = ref(0);
const uploadRef = ref(null);
const fileReadyTransfer = ref([]);

const uploadingPercentage = ref(0);
const uploadingTotalSize = ref(0);
const uploadingSize = ref(0);
const uploadingFile = ref("");
const uploadingResFile = ref("");

const showUploadList = ref(false);
const fileToTransfer = ref([]);
const fileToTransferChecked = ref([]);

const handleUploadChange = (data) => {
  fileListLength.value = data.fileList.length;
  fileReadyTransfer.value = data.fileList;
};

const handleUpload = () => {
  showUploadList.value = true;
  fileToTransfer.value = [];
  fileToTransferChecked.value = [];
  fileReadyTransfer.value.forEach((file) => {
    const fileData = {};
    fileData.name = path.value + "/" + file.file.name;
    fileData.size = file.file.size;
    fileData.status = "pending";
    fileData.data = null;
    fileData.file = file.file;
    fileData.type = "file";
    fileData.selected = true;
    fileToTransfer.value.push(fileData);
    fileToTransferChecked.value.push(fileData.name);
  });

  fileUpload(0)
    .then(async () => {
      fileListLength.value = 0;
      //uploadRef.value.clear();
      fileReadyTransfer.value = [];
      loadDir(path.value);
      uploadingFile.value = "";
      uploadingPercentage.value = 0;
      uploadingTotalSize.value = 0;
      showUploadList.value = false;
      fileToTransfer.value = [];
      fileToTransferChecked.value = [];
    })
    .catch((err) => {
      message.error(err);
      showUploadList.value = false;
      uploadingFile.value = "";
      uploadingPercentage.value = 0;
      uploadingTotalSize.value = 0;
      fileToTransfer.value = [];
      fileToTransferChecked.value = [];
    });
};

const fileUpload = (filePos) => {
  return new Promise((resolve, reject) => {
    if (filePos + 1 > fileToTransfer.value.length) {
      resolve();
    } else if (fileToTransfer.value[filePos].selected === true) {
      if (fileToTransfer.value[filePos].type == "file") {
        fileToTransfer.value[filePos].status = "uploading";
        fileSend(fileToTransfer.value[filePos])
          .then(() => {
            fileToTransfer.value[filePos].status = "finished";
            filePos++;
            fileUpload(filePos).then(() => {
              resolve();
            });
          })
          .catch((e) => {
            fileToTransfer.value[filePos].status = "error";
            filePos++;
            reject("fileUpload error: " + e);
          });
      } else {
        fileToTransfer.value[filePos].status = "creating";
        makeDir(fileToTransfer.value[filePos].name)
          .then(() => {
            fileToTransfer.value[filePos].status = "finished";
            filePos++;
            fileUpload(filePos).then(() => {
              resolve();
            });
          })
          .catch((e) => {
            fileToTransfer.value[filePos].status = "error";
            filePos++;
            reject("fileUpload error: " + e);
          });
      }
    } else {
      fileToTransfer.value[filePos].status = "ignored";
      filePos++;
      fileUpload(filePos).then(() => {
        resolve();
      });
    }
  });
};

const fileSend = (file) => {
  return new Promise((resolve, reject) => {
    // create file
    createFile(file.name, file.size)
      .then(() => {
        uploadingFile.value = file.name;
        uploadingTotalSize.value = file.size;

        // send file data
        //console.log("file created : " + file.name);
        message.success("Uploading file : " + file.name);

        if (file.data == null) {
          let reader = new FileReader();
          reader.onload = (f) => {
            if (f.target.result.byteLength > 0) {
              let fileSource = new Uint8Array(f.target.result);
              //console.log("local file read");
              //console.log("file size : " + fileSource.byteLength);
              fileSendData(fileSource, 0)
                .then(() => {
                  //console.log("file send");
                  resolve();
                })
                .catch((error) => {
                  console.log("fileSend fileSendData : " + error);
                  reject("fileSendData : " + error);
                });
            }
          };
          reader.onerror = function () {
            reader.abort();
            console.log("Failed to read file : " + reader.error);
          };

          reader.readAsArrayBuffer(file.file);
        } else {
          fileSendData(file.data, 0)
            .then(() => {
              //console.log("file send");
              resolve();
            })
            .catch((error) => {
              console.log("fileSend fileSendData : " + error);
              reject("fileSendData : " + error);
            });
        }
      })
      .catch((e) => {
        reject("createFile : " + e);
      });
  });
};

const fileSendData = (fileData, firmwareProgress) => {
  return new Promise((resolve /*, reject*/) => {
    let packetLength = mtuSize.value;

    let element = fileData.slice(
      firmwareProgress,
      firmwareProgress + packetLength
    );

    dataFile(element, element.byteLength, firmwareProgress).then(() => {
      firmwareProgress += element.byteLength;
      uploadingPercentage.value =
        (firmwareProgress / fileData.byteLength) * 100;

      //console.log(firmwareProgress);
      uploadingSize.value = firmwareProgress;
      if (firmwareProgress < fileData.byteLength) {
        fileSendData(fileData, firmwareProgress).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

const createFileListColumns = () => {
  return [
    {
      title: "File",
      key: "file",
      render(row) {
        return row.flags == 0
          ? h(
              NButton,
              {
                size: "small",
                quaternary: true,
                type: "primary",
                onClick: () => {
                  message.info("Download not supported yet...");
                },
              },
              {
                default: () =>
                  h(
                    NSpace,
                    { style: { padding: "6px" } },
                    {
                      default: () => [
                        h(NIcon, null, { default: () => h(File) }),
                        h(NText, null, { default: () => row.file }),
                      ],
                    }
                  ),
              }
            )
          : h(
              NButton,
              {
                size: "small",
                quaternary: true,
                type: "info",
                onClick: () => {
                  let navPath = row.file;
                  if (navPath == "..") {
                    navPath = path.value.split("/").slice(0, -1).join("/");
                  } else {
                    if (path.value == "/") {
                      navPath = "/" + navPath;
                    } else {
                      navPath = path.value + "/" + navPath;
                    }
                  }
                  loadDir(navPath);
                },
              },
              {
                default: () =>
                  h(
                    NSpace,
                    { style: { padding: "6px" } },
                    {
                      default: () => [
                        h(NIcon, null, {
                          default: () =>
                            h(row.file == ".." ? LevelUpAlt : FolderOpen),
                        }),
                        h(NText, null, { default: () => row.file }),
                      ],
                    }
                  ),
              }
            );
      },
    },
    {
      title: "Size",
      key: "size",
      render(row) {
        return row.flags == 0 ? humanFileSize(row.size, true, 2) : null;
      },
      ellipsis: {
        tooltip: true,
      },
    },
    {
      title: "",
      key: "actions",
      render(row) {
        return row.file != ".."
          ? useRenderAction([
              {
                label: "Delete",
                onClick: () => {
                  let navPath = row.file;
                  if (path.value == "/") {
                    navPath = "/" + navPath;
                  } else {
                    navPath = path.value + "/" + navPath;
                  }
                  deleteFile(navPath).then(() => {
                    loadDir(path.value);
                  });
                },
              },
            ])
          : null;
      },
    },
  ];
};
const deviceFileListColumns = createFileListColumns();

const createUploadFileListColumns = () => {
  return [
    {
      type: "selection",
      disabled(row) {
        return row.type === "dir";
      },
    },
    {
      title: "Name",
      key: "name",
      render(row) {
        return h(
          NSpace,
          { style: { padding: "6px" } },
          {
            default: () => [
              h(NIcon, null, {
                default: () => h(row.type == "file" ? FileUpload : FolderPlus),
              }),
              h(NText, null, { default: () => row.name }),
            ],
          }
        );
      },
    },
    {
      title: "",
      key: "status",
    },
  ];
};
const uploadFileListColumns = createUploadFileListColumns();

// eslint-disable-next-line no-unused-vars
const rowClassName = (row, index) => {
  return row.status;
};

const handlefileToTransferCheck = (rowKeys) => {
  fileToTransferChecked.value = rowKeys;
  fileToTransfer.value.forEach((file) => {
    file.selected = false;
  });
  rowKeys.forEach((key) => {
    let row = fileToTransfer.value.find((row) => row.name == key);
    if (row) {
      row.selected = true;
    }
  });
};

// -----------------------------------------------------------------------------------
// handle resource file upload
const resourceUpload = ({ file, onFinish }) => {
  message.success("Reading resource file " + file.file.name);
  uploadingResFile.value = file.file.name;
  let reader = new FileReader();
  reader.onload = (f) => {
    if (f.target.result.byteLength > 0) {
      let fileSource = new Uint8Array(f.target.result);
      console.log("local res file read");
      console.log("file size : " + fileSource.byteLength);

      let resZip = new JsZip();
      resZip.loadAsync(fileSource).then(function (zip) {
        // you now have every files contained in the loaded zip
        fileToTransfer.value = [];
        fileToTransferChecked.value = [];
        zip.forEach(function (relativePath, zipEntry) {
          const fileData = {};
          if (zipEntry.dir) {
            relativePath = relativePath.slice(0, -1);
            //console.log("Directory " + relativePath + "");
            fileData.name = "/" + relativePath;
            fileData.type = "dir";
            fileData.status = "pending";
            fileData.size = 0;
            fileData.selected = true;
            fileToTransfer.value.push(fileData);
            fileToTransferChecked.value.push(fileData.name);
            //message.success("Creating directory " + relativePath + "");
            //makeDir("/" + relativePath);
          } else {
            //message.success("Uploading file " + relativePath + "");
            zipEntry.async("uint8array").then(function (data) {
              fileData.name = "/" + relativePath;
              fileData.data = data;
              fileData.size = data.length;
              fileData.status = "pending";
              fileData.type = "file";
              fileData.selected = true;
              fileToTransfer.value.push(fileData);
              fileToTransferChecked.value.push(fileData.name);
              //console.log("File " + relativePath + "");
            });
          }
          showUploadList.value = true;
        });
      });
    }
  };
  reader.onerror = function () {
    reader.abort();
    console.log("Failed to read file : " + reader.error);
  };

  reader.readAsArrayBuffer(file.file);

  onFinish();
};

const handleUploadRes = () => {
  fileUpload(0)
    .then(() => {
      uploadingFile.value = "";
      uploadingPercentage.value = 0;
      uploadingTotalSize.value = 0;
      showUploadList.value = false;
      fileToTransfer.value = [];
      fileToTransferChecked.value = [];
      uploadingResFile.value = "";
      loadDir(path.value);
    })
    .catch((err) => {
      message.error(err);
      console.log("Resource upload error : " + err);
      uploadingResFile.value = "";
      showUploadList.value = false;
      uploadingFile.value = "";
      uploadingPercentage.value = 0;
      uploadingTotalSize.value = 0;
      fileToTransfer.value = [];
      fileToTransferChecked.value = [];
    });
};

const handleUploadResCancel = () => {
  uploadingResFile.value = "";
  showUploadList.value = false;
  uploadingFile.value = "";
  uploadingPercentage.value = 0;
  uploadingTotalSize.value = 0;
  fileToTransfer.value = [];
  fileToTransferChecked.value = [];
};

// ------------------------------------------------------------------------------

const connectDevice = () => {
  try {
    requestBlE();
  } catch (error) {
    message.error("Request BLE : " + error, {
      closable: true,
      duration: 10000,
    });
  }
};

const onDisconnected = () => {
  message.success("Device is disconnected.");
  isConnected.value = false;
};

// request connection to a Pinetime device
const requestBlE = () => {
  let options = {
    filters: [
      {
        name: "InfiniTime",
      },
    ],
    optionalServices: [0xfebb, 0x180a],
  };
  if (navigator.bluetooth == undefined) {
    message.error("Sorry, Your device does not support Web BLE!", {
      closable: true,
      duration: 10000,
    });
    return;
  }

  navigator.bluetooth
    .requestDevice(options)
    .then((device) => {
      bleDevice.value = device;
      bleDevice.value.addEventListener(
        "gattserverdisconnected",
        onDisconnected
      );
      return bleDevice.value.gatt.connect();
    })
    .then(async (server) => {
      if (server) {
        getDeviceCharacteristic();
        getDeviceFileCharacteristic();
        isConnected.value = true;
      }
    })
    .catch((error) => {
      message.error("BLE Connection : " + error, {
        closable: true,
        duration: 10000,
      });
      isConnected.value = false;
    });
};

const getDeviceCharacteristic = () => {
  bleDevice.value.gatt
    .getPrimaryService(0x180a)
    .then(async (service) => {
      const characteristic1 = await service.getCharacteristic(0x2a28);
      const value1 = await characteristic1.readValue();
      deviceName.value = decode(value1);

      const characteristic2 = await service.getCharacteristic(0x2a26);
      const value2 = await characteristic2.readValue();
      deviceVersion.value = decode(value2);
    })
    .catch((error) => {
      message.error("getDeviceCharacteristic: " + error, {
        closable: true,
        duration: 10000,
      });
    });
};

const reloadServices = () => {
  getDeviceFileCharacteristic();
};

const getDeviceFileCharacteristic = () => {
  bleDevice.value.gatt
    .getPrimaryService(0xfebb)
    .then(async (service) => {
      fileServiceReady.value = false;
      const characteristic1 = await service.getCharacteristic(
        "adaf0100-4669-6c65-5472-616e73666572"
      );
      const value1 = await characteristic1.readValue();
      fileServiceVersion.value =
        padHex(value1.getUint8(0)) + padHex(value1.getUint8(1));

      await service
        .getCharacteristic("adaf0200-4669-6c65-5472-616e73666572")
        .then((characteristic) => {
          fileTransfer.value = characteristic;
          fileServiceReady.value = true;

          characteristic.startNotifications().then((_) => {
            if (_) null;
            characteristic.addEventListener(
              "characteristicvaluechanged",
              handleFileNotifications
            );
          });

          loadDir(path.value);
        });
    })
    .catch((error) => {
      message.error("getDeviceFileCharacteristic: " + error, {
        closable: true,
        duration: 10000,
      });
    });
};

let dirList = {};

const handleFileNotifications = (event) => {
  let value = event.target.value;
  let offset = 0;
  //console.log('handleFileNotifications');
  if (value.getUint8(offset) == 0x51) {
    //console.log(value);
    dirList = {};
    offset++;
    dirList.status = value.getUint8(offset);
    offset++;
    dirList.path_length = value.getUint16(offset, true);
    offset += 2;
    dirList.entry = value.getUint32(offset, true);
    offset += 4;
    dirList.totalentries = value.getUint32(offset, true);
    offset += 4;
    dirList.flags = value.getUint32(offset, true);
    offset += 4;
    dirList.modification_time = value.getBigUint64(offset, true);
    offset += 8;
    dirList.file_size = value.getUint32(offset, true);
    offset += 4;
    dirList.path = decode(value.buffer.slice(offset));
    //console.log(offset);

    if (dirList.path_length != 0 && dirList.path != ".") {
      deviceFileList.value.push({
        key: dirList.entry,
        file: dirList.path,
        size: dirList.file_size,
        flags: dirList.flags,
      });
    }
    deviceFileList.value.sort(function (a, b) {
      return b.flags - a.flags;
    });
    /*if (dirList.path_length == 0) {
      loadingFolder.value = false;
    }*/
  } else if (value.getUint8(offset) == 0x41) {
    // Create DIR
    offset++;
    let status = value.getUint8(offset);
    if (status == 0x01) {
      message.success("Directory created.");
    } else {
      console.log("Error creating directory. [" + status + "]");
    }
    //loadDir(path.value);
  } else if (value.getUint8(offset) == 0x31) {
    // DeleteFile/Dir
    offset++;
    let status = value.getUint8(offset);
    if (status == 0x01) {
      message.success("File deleted.");
    } else {
      message.error("Error deleting file. [" + status + "]");
    }
    //loadDir(path.value);
  } else if (value.getUint8(offset) == 0x21) {
    // File Upload
    offset++;
    let status = value.getUint8(offset);
    if (status == 0x01) {
      //message.success("File created.");
    } else {
      message.error("Error creating file. [" + status + "]");
    }
  } else {
    message.success("File Notification : " + value.getUint8(offset), {
      closable: true,
      duration: 10000,
    });
  }
};

const loadDir = (dirPath) => {
  return new Promise((resolve, reject) => {
    if (dirPath == "") {
      dirPath = "/";
    }

    deviceFileList.value = [];

    path.value = dirPath;
    let header = new Uint8Array(4);
    let size = toBytesInt16(dirPath.length);

    /*
      Command (single byte): 0x50
      1 byte of padding
      Unsigned 16-bit integer encoding the length of the file path.
      File path: UTF-8 encoded string that is not null terminated.

    */
    header[0] = 0x50;
    header[1] = 0x00;
    header[2] = size[1];
    header[3] = size[0];

    let value = new Uint8Array([
      ...header,
      ...new TextEncoder().encode(dirPath),
    ]);

    //console.log(value);

    fileTransfer.value
      .writeValueWithoutResponse(value)
      .then(function () {
        //deviceFileList.value = [];
        //loadingFolder.value = true;
        resolve();
      })
      .catch(function (error) {
        reject("loadDir error : " + error);
      });
  });
};

const makeDir = (path) => {
  return new Promise((resolve, reject) => {
    let header = new Uint8Array(16);
    let size = toBytesInt16(path.length);

    /*
      Command (single byte): 0x40
      1 byte of padding
      Unsigned 16-bit integer encoding the length of the file path.
      4 bytes of padding
      Unsigned 64-bit integer encoding the unix timestamp with nanosecond resolution.
      File path: UTF-8 encoded string that is not null terminated.

    */
    header[0] = 0x40;
    header[1] = 0x00;
    header[2] = size[1];
    header[3] = size[0];
    header[4] = 0x00;
    header[5] = 0x00;
    header[6] = 0x00;
    header[7] = 0x00;

    header[8] = 0x00;
    header[9] = 0x00;
    header[10] = 0x00;
    header[11] = 0x00;
    header[12] = 0x00;
    header[13] = 0x00;
    header[14] = 0x00;
    header[15] = 0x00;

    let value = new Uint8Array([...header, ...new TextEncoder().encode(path)]);

    //console.log(value);

    fileTransfer.value
      .writeValue(value)
      .then(function () {
        resolve();
      })
      .catch(function (error) {
        reject("makeDir error : " + error);
      });
  });
};

const deleteFile = (path) => {
  return new Promise((resolve, reject) => {
    let header = new Uint8Array(4);
    let size = toBytesInt16(path.length);

    /*
      Command (single byte): 0x30
      1 byte of padding
      Unsigned 16-bit integer encoding the length of the file path.
      File path: UTF-8 encoded string that is not null terminated.

    */
    header[0] = 0x30;
    header[1] = 0x00;
    header[2] = size[1];
    header[3] = size[0];

    let value = new Uint8Array([...header, ...new TextEncoder().encode(path)]);

    //console.log(value);

    fileTransfer.value
      .writeValue(value)
      .then(function () {
        //deviceFileList.value = [];
        resolve();
      })
      .catch(function (error) {
        reject("deleteFile error : " + error);
      });
  });
};

const createFile = (path, fileSize) => {
  return new Promise((resolve, reject) => {
    let header = new Uint8Array(20);
    let sizeP = toBytesInt16(path.length);
    let sizeF = toBytesInt32(fileSize);

    /*
    Command (single byte): 0x20
    1 byte of padding
    Unsigned 16-bit integer encoding the length of the file path.
    Unsigned 32-bit integer encoding the location at which to start writing to the file.
    Unsigned 64-bit integer encoding the unix timestamp with nanosecond resolution. This will be used as the modification time. At the time of writing, this is not implemented in InfiniTime, but may be in the future.
    Unsigned 32-bit integer encoding the size of the file that will be sent
    File path: UTF-8 encoded string that is not null terminated.

  */
    header[0] = 0x20;
    header[1] = 0x00;
    header[2] = sizeP[1];
    header[3] = sizeP[0];

    header[4] = 0x00;
    header[5] = 0x00;
    header[6] = 0x00;
    header[7] = 0x00;

    header[8] = 0x00;
    header[9] = 0x00;
    header[10] = 0x00;
    header[11] = 0x00;
    header[12] = 0x00;
    header[13] = 0x00;
    header[14] = 0x00;
    header[15] = 0x00;

    header[16] = sizeF[3];
    header[17] = sizeF[2];
    header[18] = sizeF[1];
    header[19] = sizeF[0];

    let value = new Uint8Array([...header, ...new TextEncoder().encode(path)]);

    //console.log(value);
    fileTransfer.value
      .writeValue(value)
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};

const dataFile = (data, dataSize, offset) => {
  return new Promise((resolve) => {
    let header = new Uint8Array(12);

    let aOffset = toBytesInt32(offset);
    let sizeD = toBytesInt32(dataSize);

    /*
    Command (single byte): 0x22
    Status: 0x01
    2 bytes of padding.
    Unsigned 32-bit integer encoding the location at which to write the next chunk.
    Unsigned 32-bit integer encoding the amount of bytes to be written.
    Data

  */
    header[0] = 0x22;
    header[1] = 0x01;
    header[2] = 0x00;
    header[3] = 0x00;

    header[4] = aOffset[3];
    header[5] = aOffset[2];
    header[6] = aOffset[1];
    header[7] = aOffset[0];

    header[8] = sizeD[3];
    header[9] = sizeD[2];
    header[10] = sizeD[1];
    header[11] = sizeD[0];

    let value = new Uint8Array([...header, ...data]);

    //console.log(value);
    fileTransfer.value.writeValue(value).then(() => {
      resolve();
    });
  });
};

const disconnectDevice = () => {
  isConnected.value = false;
  fileServiceReady.value = false;
  if (!bleDevice.value) {
    return;
  }
  if (bleDevice.value.gatt.connected) {
    bleDevice.value.gatt.disconnect();
  } else {
    message.success("Bluetooth Device is already disconnected");
  }
};

const onDirCreate = () => {
  //message.success("mkDir");
  if (path.value == "") {
    message.error("Please select a directory to create.");
    return;
  }
  if (!path.value.endsWith("/")) {
    dirName.value = "/" + dirName.value;
  }
  makeDir(path.value + dirName.value).then(() => {
    message.success("Directory created");
    dirName.value = "";
    loadDir(path.value);
  });
};

// -----------------------------------------------------------------------------------

const decode = (buf) => {
  let dec = new TextDecoder("utf-8");
  return dec.decode(buf);
};

const padHex = (value) => {
  return ("00" + value.toString(16).toUpperCase()).slice(-2);
};

const toBytesInt16 = (num) => {
  let arr = new Uint8Array([(num & 0xff00) >> 8, num & 0x00ff]);
  return arr;
};

const toBytesInt32 = (num) => {
  let arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
  let view = new DataView(arr);
  view.setUint32(0, num, false); // byteOffset = 0; litteEndian = false
  return new Uint8Array(arr);
};

// eslint-disable-next-line no-unused-vars
const delay = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const humanFileSize = (bytes, si = false, dp = 1) => {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " bytes";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
};
</script>

