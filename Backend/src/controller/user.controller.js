const UserSchema = require('../models/user.models');
const Utils = require('../utils/index');
const sharp = require('sharp')
const services = require('../services/index');

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.toLowerCase();
        let isUser = await UserSchema.findByCredentials(email, password);
        if (!isUser)
            return sendErrorResponse(req, res, 400, 'user is not exists');
        let token = await isUser.generateAuthToken();

        return Utils.sendSuccessResponse(req, res, 200, { user: isUser, authToken: token });
    }
    catch (e) {
        return Utils.sendErrorResponse(req, res, 400, e.message);
    }
}
exports.signUp = async (req, res) => {
    try {
        let { email, fName, lName, password, type } = req.body;
        if (!email) return Utils.sendErrorResponse(req, res, 400, 'send emailId');
        req.body.email = email.toLowerCase();
        req.body.fName = fName.toLowerCase();
        req.body.lName = lName.toLowerCase();
        if (type)
            req.body.type = type.toLowerCase();
        let isUser = await UserSchema.findOne({ email: req.body.email });
        if (isUser)
            return Utils.sendErrorResponse(req, res, 400, 'user has already account with this email');
        let newUser = new UserSchema(req.body);
        await newUser.save();
        return Utils.sendSuccessResponse(req, res, 200, { message: 'successfully user has created his account' });
    }

    catch (e) {
        return Utils.sendErrorResponse(req, res, 500, e.message);
    }
}
/**
 * 
 * @param {*} req 
 * @param {*} res 
 */
exports.uploadProfile = async (req, res) => {
    try {
        console.log(req.body);
        console.log(req.file);

        const buffer = await sharp(req.file.buffer)
            .resize({ width: 250, height: 250 })
            .png()
            .toBuffer();
        const user = await UserSchema.findOneAndUpdate(
            { email: req.user.email },
            { profilePicture: buffer },
            { new: true }
        );

        if (!user) {
            throw { message: "user does not exist" };
        }
        res.contentType("image/png");
        res.send(buffer);
    } catch (e) {
        //console.log(e)
        return Utils.sendErrorResponse(req, res, 400, e.message);
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.getProfilePic = async (req, res) => {
    try {

        if (!req.user.profilePicture) return Utils.sendErrorResponse(req, res, 200, 'No profile');
        res.contentType("image/png");
        res.send(req.user.profilePicture);
    }
    catch (e) {
        return Utils.sendErrorResponse(req, res, 400, e.message);
    }
}
exports.updateUserInfo = async (req, res) => {
    try {
        const user = await UserSchema.findOneAndUpdate(
            { _id: req.user._id },
            { $set: { ...req.body } },
            { new: true },
        );
        return Utils.sendSuccessResponse(req, res, 201, { message: "successfully updated", data: user });
    }
    catch (e) {
        return Utils.sendErrorResponse(req, res, 400, e.message);
    }
}

exports.getUsersInfo = async (req, res) => {
    try {

        return Utils.sendSuccessResponse(req, res, 200, req.user);
    }
    catch (e) {
        return Utils.sendErrorResponse(req, res, 400, e.message)
    }
}


/** generate reset password link */
exports.generateResetPasswordLink = async (req, res) => {
    try {
        let userEmail = req.body.userEmail;
        if (!userEmail) return Utils.sendErrorResponse(req, res, 400, 'send userEmail');
        userEmail = userEmail.toLowerCase();
        const isUser = await UserSchema.findOne({ email: userEmail });
        if (!isUser) return Utils.sendErrorResponse(req, res, 400, 'user is not exists');
        const token = await isUser.generateAuthToken();
        const link = `${process.env.BASE_URL}/reset-password/${token}`;
        const html = `<p>Hi ${isUser.fName},</p><p>Click <a href="${link}">here</a> to reset your password.</p>`;
        await services.sendMail(userEmail, 'Reset Password', html);
        return Utils.sendSuccessResponse(req, res, 200, { message: 'Reset password link has been sent to your email' });
    }
    catch (e) {
        return Utils.sendErrorResponse(req, res, 400, e.message);
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return Utils.sendErrorResponse(req, res, 400, 'send password');
        const user = await UserSchema.findOne({ _id: req.user._id });
        if (!user) return Utils.sendErrorResponse(req, res, 400, 'user is not exists');
        user.password = password;
        await user.save();
        return Utils.sendSuccessResponse(req, res, 200, { message: 'password has been reset successfully' });

    }
    catch (e) {
        return Utils.sendErrorResponse(req, res, 400, e.message);
    }
}

//Registrating user(login with google)
exports.signupOrLoginWithGoogle = async (profile) => {
    try {
         let{name}=profile;
         let names=name.split(" ");
         let fname=names[0].toLowerCase();
         let lname=names[names.length-1].toLowerCase();
        let user = await UserSchema.findOne({email: profile.email });
        if (!user) {
            // If the user doesn't exist, create a new user in the database
            user =new UserSchema({
                id: profile.id,
                email: profile.email,
                fName:fname,
                lName:lname,
                loginwith:1
            });
            // Save the user to the database
            await user.save();
        }
        let token = await user.generateAuthToken();
        return token;
    }
    catch(err){
        throw new Error("User Registration Failed");
    }
}