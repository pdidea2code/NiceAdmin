const express = require("express");
const app = express();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
require("dotenv").config()

const deleteFiles = (files) => {
  const basePath = path.join(__dirname, "./uploads");

  try {
    if (!files) {
      console.error("No files provided for deletion.");
      return;
    }

    //check many file
    if (Array.isArray(files)) {
      files.forEach((file) => {
        const filePath = path.join(basePath, file); //join baseurl and filename

        //check file is exist
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); //delete file
          console.log(`${file} deleted successfully.`);
        } else {
          console.log(`${file} does not exist.`);
        }
      });
    } else {
      const filePath = path.join(basePath, files);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`${files} deleted successfully.`);
      } else {
        console.log(`${files} does not exist.`);
      }
    }
  } catch (error) {
    console.error("Error deleting files:", error);
  }
};

mongoose
  .connect(
    process.env.DB_URL
  )
  .then((data) => {
    console.log("db connected");
  })
  .catch((error) => {
    console.log(error);
  });

app.use(
  session({
    secret: "123456", // Replace with a strong, unique key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true in production with HTTPS
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use("/assets", express.static(path.join(__dirname, "assets")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() + "-" + file.originalname.replace(/\s/g, "-").toLowerCase()
    );
  },
});
const fileFilter = function (req, file, cb) {
  const fileTypes = /jpeg|jpg|png|gif|mp4|mkv|avi|webm/;
  const mimeType = fileTypes.test(file.mimetype);
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  if (mimeType && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Error: File upload only supports the following filetypes - " +
          fileTypes
      )
    );
  }
};
const uploade = multer({ storage: storage, fileFilter: fileFilter });

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  mimetype: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

const Image = mongoose.model("image", imageSchema);
app.use("/Images", express.static(path.join(__dirname, "./uploads")));
app.get("/", (req, res) => {
  res.render("homepage");
});
app.get("/upload", (req, res) => {
  res.render("upload");
});
app.get("/chat", (req, res) => {
  res.render("chat");
});
app.get("/heder", (req, res) => {
  res.render("heder");
});
app.get("/edit", (req, res) => {
  res.render("edit");
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/imgadd", uploade.array("iamge", 5), async (req, res, next) => {
  try {
    const files = req.files;

    const file = await Promise.all(
      files.map(async (data) => {
        const firstParameter = data.mimetype.split("/")[0];
        const imgdata = await Image.create({
          name: data.filename,
          mimetype: firstParameter,
        });
        return imgdata;
      })
    );
    res.render("upload");
  } catch (error) {
    console.log(error);
    res.render("upload", { error: error.message });
  }
});

app.get("/getimg", async (req, res, next) => {
  try {
    const image = await Image.find({status:true});
    const images = await Image.find({ mimetype: "image" ,status:true}).countDocuments();
    const videos = await Image.find({ mimetype: "video",status:true }).countDocuments();

    if (!image || image.length === 0) {
      return res.render("get_image", {
        item: 404,
        message: "Data Not Found",
        images: 0,
        videos: 0,
      });
    }

    res.render("get_image", {
      item: image,
      images: images,
      videos: videos,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/delete-image/:id", async (req, res, next) => {
  try {
    console.log(req.params.id);
    const image = await Image.findById(req.params.id);

    // console.log(image.name)
    deleteFiles(image.name);
    const deletes = await Image.deleteOne({ _id: image._id });
    console.log(deletes);
    const images = await Image.find({ mimetype: "image" }).countDocuments();
    const videos = await Image.find({ mimetype: "video" }).countDocuments();
    const data = await Image.find();

    res.render("get_image", {
      images: images,
      videos: videos,
      item: data,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/datatable", async (req, res) => {
  try {
    const data = await Image.find();
    if (!data) {
      return console.log("Data Not Found");
    }
    res.render("datatable", {
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
});

app.delete("/delete-image-data/:id", async (req, res, next) => {
  try {
    console.log(req.params.id);
    const image = await Image.findById(req.params.id);

    deleteFiles(image.name);
    const deletes = await Image.deleteOne({ _id: image._id });
    console.log(deletes);

    const data = await Image.find();

    res.render("datatable", {
      data: data,
    });
  } catch (error) {
    console.log(error);
  }
});

app.put("/update-image-data/:id", uploade.single("file"), async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      console.log("Image Not Found");
    }
    if (req.file.filename) {
      deleteFiles(image.name);
      image.name = req.file.filename;
    }

    await image.save();
    const images = await Image.find();
    res.render("datatable", { data: images });
  } catch (error) {
    console.log(error);
  }
});

app.get("/img-data", async (req, res) => {
  try {
    const item = await Image.find({ mimetype: "image" ,status:true });

    if (item.length == 0 && !item) {
      res.render("images", {
        item: 404,
        message: "Image Not Found",
      });
    }

    res.render("images", {
      item: item,
    });
  } catch (error) {
    console.log(error);
  }
});

app.put("/update-image/:id", uploade.single("image"), async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: "data not found" });
    }
    if (req.file.filename) {
      deleteFiles(image.name);
      image.name = req.file.filename;
    }

    await image.save();
    res
      .status(200)
      .json({ success: true, message: "update successfully", data: image });
  } catch (error) {
    console.log(error);
  }
});

app.put("/update-image-status/:id", async (req, res) => {
  try {
    const image=await Image.findById(req.params.id)
    if(!image){
      return res.render("datatable")
    }

    image.status=req.body.status
    await image.save()
    const data=await Image.find()
    res.render("datatable",{
      data:data
    })
   
  } catch (error) {
    console.log(error);
  }
});



app.listen(5000, () => console.log("app run 5000 port"));
