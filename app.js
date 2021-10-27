const express = require("express");
const aws = require("aws-sdk");
const config = require("./src/config");

require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

aws.config.update({
  accessKeyId: process.env.AWSACCESSKEY,
  secretAccessKey: process.env.AWSSECRETKEY,
  region: process.env.AWSREGION,
});

const textract = new aws.Textract();

app.post("/analyse", async (req, res) => {
  const { bucketName, objectKey } = req.body;

  try {
    // const bucketName = "carcassv0.1";
    // const objectKey =
    //   "ng-government-gazette-dated-2020-01-14-no-6/ng-government-gazette-dated-2020-01-14-no-6.pdf";

    const params = {
      DocumentLocation: {
        S3Object: {
          Bucket: bucketName,
          Name: objectKey,
        },
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
    var params = {
      JobId,
      // JobId:
      //   "980955f5bba15b9705b1d6302e1fbe63566aeaa5f2d8e47e69b276772cd0f38f" /* required */,
    };
    textract.getDocumentTextDetection(params, function (err, data) {
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

app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
