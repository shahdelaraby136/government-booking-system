const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Slot = require("../models/Slot");
const { sendBookingConfirmation } = require("../services/mailer");

// POST /api/appointments - Create a new booking
router.post(
  "/",
  [
    body("serviceId").isMongoId().withMessage("Valid service ID is required"),
    body("branchId").isMongoId().withMessage("Valid branch ID is required"),
    body("slotId").isMongoId().withMessage("Valid slot ID is required"),
    body("citizenName")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters")
      .escape(),
    body("citizenEmail")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage("Email is too long"),
    body("citizenPhone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^01[0125]\d{8}$/)
      .withMessage("Please enter a valid Egyptian phone number (e.g. 01012345678)"),
    body("nationalId")
      .trim()
      .notEmpty()
      .withMessage("National ID is required")
      .matches(/^\d{14}$/)
      .withMessage("National ID must be exactly 14 digits"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { serviceId, branchId, slotId, citizenName, citizenEmail, citizenPhone, nationalId } =
        req.body;

      // Check slot availability atomically
      const slot = await Slot.findById(slotId).session(session);

      if (!slot) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Slot not found" });
      }

      if (!slot.isActive) {
        await session.abortTransaction();
        return res.status(410).json({ success: false, message: "This slot is no longer active" });
      }

      if (slot.bookedCount >= slot.capacity) {
        await session.abortTransaction();
        return res
          .status(409)
          .json({ success: false, message: "This time slot is no longer available" });
      }

      // Check if citizen already booked this slot
      const existingBooking = await Appointment.findOne({
        slotId,
        nationalId,
        status: "confirmed",
      }).session(session);

      if (existingBooking) {
        await session.abortTransaction();
        return res
          .status(409)
          .json({ success: false, message: "You already have a booking for this time slot" });
      }

      // Increment booked count atomically
      slot.bookedCount += 1;
      await slot.save({ session });

      // Create the appointment
      const appointment = new Appointment({
        serviceId,
        branchId,
        slotId,
        citizenName,
        citizenEmail,
        citizenPhone,
        nationalId,
      });
      await appointment.save({ session });

      await session.commitTransaction();

      // Populate references for the response
      const populatedAppointment = await Appointment.findById(appointment._id)
        .populate("serviceId", "name")
        .populate("branchId", "name address city")
        .populate("slotId", "date startTime endTime");

      // Fire-and-forget email — never block or fail the booking on mail errors
      sendBookingConfirmation(populatedAppointment).catch((e) =>
        console.error("[mailer] uncaught:", e.message)
      );

      res.status(201).json({
        success: true,
        message: "Booking confirmed successfully",
        data: populatedAppointment,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Booking error:", error.message);
      res.status(500).json({ success: false, message: "Booking failed. Please try again." });
    } finally {
      session.endSession();
    }
  }
);

module.exports = router;
