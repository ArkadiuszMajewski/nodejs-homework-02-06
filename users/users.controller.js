const userDao = require("./users.dao");
const authService = require("../auth/auth.service");
const path = require("path");
const fs = require("fs/promises");
const mimetypes = require("mime-types");
const express = require("express");
const gravatar = require("gravatar");
const jimp = require("jimp");
const { User } = require("./user.model");
const { sendUserVerificationMail } = require("./user-mailer.service");

const signupHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const avatar = gravatar.url(email, {
      protocol: req.protocol,
      default: "retro",
    });
    const avatarURL = avatar;

    const createdUser = await userDao.createUser({
      email,
      password,
      avatarURL,
    });

    await sendUserVerificationMail(
      createdUser.email,
      createdUser.verificationToken
    );

    return res.status(201).send({
      user: {
        email: createdUser.email,
        subscription: createdUser.subscription,
        avatar: avatarURL,
      },
    });
  } catch (e) {
    const { message } = e;

    if (e instanceof userDao.DuplicatedKeyError) {
      return res.status(409).send({ message });
    }

    return next(e);
  }
};

const secretHandler = async (req, res, next) => {
  try {
    const userEntity = await userDao.getUser({ id: req.body.id });

    return res.status(200).send({
      userEntity,
    });
  } catch (e) {
    return next(e);
  }
};

const loginHandler = async (req, res, next) => {
  try {
    console.log(req.body.password);
    const userEntity = await userDao.getUser({ email: req.body.email });
    const isUserPasswordValid = await userEntity.validatePassword(
      req.body.password
    );

    if (!userEntity || !isUserPasswordValid) {
      return res.status(401).send({ message: "Email or password is wrong" });
    }
    if (!userEntity.verified) {
      return res
        .status(401)
        .send({ message: "User is not verified or expired" });
    }
    const userPayload = {
      email: userEntity.email,
      subscription: userEntity.subscription,
    };

    const token = authService.generateAccessToken(userPayload);
    await userDao.updateUser(userEntity.email, { token });

    return res.status(200).send({
      token,
      user: userPayload,
    });
  } catch (e) {
    return next(e);
  }
};

const logoutHandler = async (req, res, next) => {
  try {
    const { email } = req.user;
    await userDao.updateUser(email, { token: null });

    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
};

const currentHandler = async (req, res, next) => {
  try {
    const { email, subscription, avatarURL } = req.user;
    return res.status(200).send({ user: { email, subscription, avatarURL } });
  } catch (e) {
    return next(e);
  }
};

const updatepPictureAvatar = async (req, res, next) => {
  try {
    const avatarImage = await jimp.read(req.file.path);
    const resizeAvatar = await avatarImage.resize(250, 250);
    const filename = `${Date.now()}.${mimetypes.extension(req.file.mimetype)}`;
    await resizeAvatar.writeAsync(
      path.join(__dirname, "public/avatars", filename)
    );

    const { email } = req.body;
    console.log(email);
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { avatarURL: `http://localhost:3000/avatars/${filename}` },
      { new: true }
    );

    res.status(201).send({ user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred " });
  }
};
const veryfyHandler = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const user = await userDao.getUser({ verificationToken });

    if (!user) {
      return res
        .status(400)
        .send({ message: "Veryfication token not valid or expired" });
    }

    if (user.verified) {
      return res.status(400).send({ message: "user alredy in use" });
    }

    await userDao.updateUser(user.email, {
      verified: true,
      verificationToken: null,
    });
    return res.status(200).send({ message: "user verified" });
  } catch (error) {
    console.error("veryfyHandler error", error);
  }
};

// const resendVerificationToken = async (req, res, nhext) => {
//   try {
//     const user = userDao.getUser({ email: req.body.email });

//     console.log(user.email);
//     if (!user) {
//       return res.status(404).send({ message: "user dosent exist" });
//     }
//     if (user.verified) {
//       return res.status(400).send({ message: "user is alredy verified" });
//     }
//     await sendUserVerificationMail(user.email, user.verificationToken);

//     return res.status(200).send({ message: "token resend" });
//   } catch (error) {
//     console.error("resendVerificationToken error");
//   }
// };
const resendVerificationHandler = async (req, res, next) => {
  try {
    const user = await userDao.getUser({ email: req.body.email });

    if (!user) {
      return res.status(404).send({ message: "User does not exist." });
    }

    if (user.verified) {
      return res.status(400).send({ message: "User is already verified." });
    }

    await sendUserVerificationMail(user.email, user.verificationToken);

    return res.status(204).send({ message: "token resend." });
  } catch {
    return next(e);
  }
};

module.exports = {
  signupHandler,
  loginHandler,
  logoutHandler,
  currentHandler,
  secretHandler,
  updatepPictureAvatar,
  veryfyHandler,
  resendVerificationHandler,
};
