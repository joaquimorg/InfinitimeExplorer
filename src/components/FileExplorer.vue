
<template>
  <n-card title="Infinitime File Explorer">
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
              <n-button type="error" @click="disconnectDevice">
                Disconnect
              </n-button>
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
          <n-grid x-gap="12" :cols="2">
            <n-gi>
              <n-space vertical>
                <n-space>
                  <n-button round type="warning" @click="loadDir('/')">
                    /
                  </n-button>
                  <n-button round type="warning" @click="loadDir(path)">
                    <template #icon>
                      <n-icon size="14" :component="Redo" />
                    </template>
                    {{ path }}
                  </n-button>
                  <n-button round type="info" @click="showModal = true">
                    Make dir
                  </n-button>
                </n-space>
                <n-data-table
                  :columns="columns"
                  :data="dataSource"
                  :pagination="false"
                />
              </n-space>
            </n-gi>
            <n-gi>
              <n-space vertical>
                <n-progress
                  type="line"
                  status="error"
                  :percentage="uploadingPercentage"
                  :height="24"                  
                  border-radius="12px 0 12px 0"
                  fill-border-radius="12px 0 12px 0"
                >
                  {{ uploadingFile }}
                </n-progress>

                <n-upload
                  ref="uploadRef"
                  :default-upload="false"
                  multiple
                  @change="handleUploadChange"
                  accept=".bin,.res,.wf"
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
                    <n-p depth="3" style="margin: 8px 0 0 0">
                      {{ path }}
                    </n-p>
                  </n-upload-dragger>
                </n-upload>
                <n-button
                  :disabled="!fileListLength"
                  style="margin-bottom: 12px"
                  @click="handleUpload"
                >
                  Upload Files
                </n-button>
              </n-space>
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
    <div :style="{ maxHeight: '60vh', height: '5vh' }">
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
</template>

<style>
.n-card .device {
  max-width: 400px;
}
</style>

<script setup>
import { ref, h } from "vue";
import { useMessage, NButton } from "naive-ui";
import { useRenderAction } from "@/components/utils";
import { Redo, FileUpload } from "@vicons/fa";

const bleDevice = ref(null);
const fileTransfer = ref(null);

const isConnected = ref(false);
const fileServiceReady = ref(false);
const message = useMessage();

const deviceName = ref("");
const deviceVersion = ref("");
const fileServiceVersion = ref(0);

const dirName = ref("");

const showModal = ref(false);

const path = ref("/");

const fileListLength = ref(0);
const uploadRef = ref(null);
const fileReadyTransfer = ref([]);

const uploadingPercentage = ref(0);
const uploadingFile = ref("");

const handleUploadChange = (data) => {
  fileListLength.value = data.fileList.length;
  fileReadyTransfer.value = data.fileList;
};

const handleUpload = () => {
  fileUpload(0).then(() => {
    fileListLength.value = 0;
    uploadRef.value.clear();
    fileReadyTransfer.value = [];
    dataSource.value = [];
    loadDir(path.value);
    uploadingFile.value = "";
    uploadingPercentage.value = 0;
  });
};

const fileUpload = (filePos) => {
  return new Promise((resolve /*, reject*/) => {
    fileSend(fileReadyTransfer.value[filePos].file).then(() => {
      filePos++;
      if (filePos < fileReadyTransfer.value.length) {
        fileUpload(filePos).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

const fileSend = (file) => {
  return new Promise((resolve /*, reject*/) => {
    // create file
    createFile(path.value + "/" + file.name, file.size).then(() => {
      uploadingFile.value = file.name;

      // send file data
      console.log("file created : " + file.name);

      let reader = new FileReader();
      reader.onload = (f) => {
        if (f.target.result.byteLength > 0) {
          let fileSource = new Uint8Array(f.target.result);
          console.log("local file read");
          console.log("file size : " + fileSource.byteLength);
          fileSendData(fileSource, 0)
            .then(() => {
              console.log("file send");
              resolve();
            })
            .catch((error) => {
              console.log("fileSend fileSendData : " + error);
            });
        }
      };
      reader.onerror = function () {
        reader.abort();
        console.log("Failed to read file : " + reader.error);
      };

      reader.readAsArrayBuffer(file);
    });
  });
};

const fileSendData = (fileData, firmwareProgress) => {
  return new Promise((resolve /*, reject*/) => {
    let packetLength = 200;

    let element = fileData.slice(
      firmwareProgress,
      firmwareProgress + packetLength
    );

    dataFile(element, element.byteLength, firmwareProgress).then(() => {
      firmwareProgress += element.byteLength;
      uploadingPercentage.value =
        (firmwareProgress / fileData.byteLength) * 100;

      console.log(firmwareProgress);
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

const createColumns = () => {
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

                onClick: () => {
                  //path.value = row.file;
                  //loadDir(path.value);
                },
              },
              { default: () => row.file }
            )
          : h(
              NButton,
              {
                size: "small",

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
              { default: () => row.file }
            );
      },
    },
    {
      title: "Size",
      key: "size",
      render(row) {
        return row.flags == 0 ? `${row.size} bytes` : null;
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
                  deleteFile(navPath);
                },
              },
            ])
          : null;
      },
    },
  ];
};

let columns = createColumns({
  play(row) {
    message.info(`${row.file}`);
  },
});

let dataSource = ref([]);

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
      // && dirList.path != ".."
      dataSource.value.push({
        key: dirList.entry,
        file: dirList.path,
        size: dirList.file_size,
        flags: dirList.flags,
      });
    }

    //console.log(dirList);
  } else if (value.getUint8(offset) == 0x41) {
    offset++;
    let status = value.getUint8(offset);
    if (status == 0x01) {
      message.success("Directory created.");
    } else {
      message.error("Error creating directory. [" + status + "]");
    }
    loadDir(path.value);
  } else if (value.getUint8(offset) == 0x31) {
    offset++;
    let status = value.getUint8(offset);
    if (status == 0x01) {
      message.success("File deleted.");
    } else {
      message.error("Error deleting file. [" + status + "]");
    }
    loadDir(path.value);
  } else if (value.getUint8(offset) == 0x21) {
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
  if (dirPath == "") {
    dirPath = "/";
  }
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

  let value = new Uint8Array([...header, ...new TextEncoder().encode(dirPath)]);

  //console.log(value);

  fileTransfer.value.writeValueWithoutResponse(value).then(function () {
    dataSource.value = [];
  });
};

const makeDir = (path) => {
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

  fileTransfer.value.writeValueWithoutResponse(value).then(function () {
    dataSource.value = [];
  });
};

const deleteFile = (path) => {
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

  fileTransfer.value.writeValueWithoutResponse(value).then(function () {
    dataSource.value = [];
  });
};

// eslint-disable-next-line no-unused-vars
const createFile = (path, fileSize) => {
  return new Promise((resolve) => {
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
    // eslint-disable-next-line no-unused-vars
    fileTransfer.value.writeValue(value).then((_) => {
      resolve();
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
    // eslint-disable-next-line no-unused-vars
    fileTransfer.value.writeValue(value).then((_) => {
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
  makeDir(path.value + dirName.value);
  dirName.value = "";
};

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
</script>

