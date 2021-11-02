const express = require("express");
const fs = require("fs");
const aws = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 9000;

aws.config.update({
  accessKeyId: process.env.AWSACCESSKEY,
  secretAccessKey: process.env.AWSSECRETKEY,
  region: process.env.AWSREGION,
});

const textract = new aws.Textract();
const s3 = new aws.S3();

const upload = multer({ dest: "src/uploads" }).single("file");

app.post("/analyse", async (req, res) => {
  const { bucketName, objectKey } = req.body;

  try {
    const params = {
      DocumentLocation: {
        S3Object: {
          Bucket: bucketName,
          Name: objectKey,
        },
      },
      NotificationChannel: {
        SNSTopicArn: process.env.SNSTOPICARN,
        RoleArn: process.env.ROLEARN,
      },
    };

    textract.startDocumentTextDetection(params, function (err, data) {
      if (err) res.status(400).send({ status: false, err, stack: err.stack });
      // an error occurred
      else res.status(200).send({ status: true, data }); // successful response
    });
  } catch (error) {
    res.status(500).send({
      status: false,
      message: "Something went wrong while processing your information",
    });
  }
});

app.get("/analyse/status/:JobId", async (req, res) => {
  const { JobId } = req.params;
  try {
    const params = {
      JobId,
    };

    textract.getDocumentTextDetection(params, function (err, data) {
      if (err)
        return res.status(400).send({ status: false, err, stack: err.stack }); // an error occurred

      if (data && data.JobStatus === "IN_PROGRESS")
        return res.status(102).send({ status: true, data });

      if (data && data.JobStatus === "SUCCEEDED") {
        const responseArray = data.Blocks;

        const lines = responseArray.filter((item) => {
          return item.BlockType === "LINE";
        });

        let pageText = "";

        lines.map((line) => {
          pageText += line.Text + "\n";
        });

        fs.writeFileSync("doc.txt", pageText);

        const timestamp = Date.now();

        fs.readFile(`doc.txt`, (error, data) => {
          if (error)
            return res
              .status(400)
              .send({ status: false, message: "Error reading file" });

          const params = {
            Bucket: "carcassv0.1", // pass your bucket name
            Key: `${JobId}_${timestamp}`,
            Body: JSON.stringify(data, null, 2),
          };
          s3.upload(params, function (err, data) {
            if (err)
              res.status(400).send({ status: false, err, stack: err.stack });
            // an error occurred
            else res.status(200).send({ status: true, data }); // successful response
          });
        });

        // res.status(200).send({ status: true, data: pageText });
      }

      res.status(200).send({ status: true, data });
    });
  } catch (error) {
    res.status(500).send({
      status: false,
      message: "Something went wrong while processing your information",
    });
  }
});

app.post("/upload", upload, async (req, res) => {
  const originalname = req.file.originalname;
  const file = req.file.filename;

  fs.readFile(`src/uploads/${file}`, (error, data) => {
    if (error)
      return res
        .status(400)
        .send({ status: false, message: "Error reading file" });

    const params = {
      Bucket: "carcassv0.1", // pass your bucket name
      Key: originalname,
      Body: JSON.stringify(data, null, 2),
    };
    s3.upload(params, function (err, data) {
      if (err) res.status(400).send({ status: false, err, stack: err.stack });
      // an error occurred
      else res.status(200).send({ status: true, data }); // successful response
    });
  });

  const filepath = `/src/uploads/${file}`;

  const route = path.join(__dirname, filepath);
  fs.unlinkSync(route);
});

app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
