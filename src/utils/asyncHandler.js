const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
       Promise
       .resolve(requestHandler(req,res,next))
       .catch((error)=>next(error));
    }
}
export {asyncHandler};

// If you pass an argument to next() → Express treats it as an error.
// Then, Express skips normal middleware/route handlers and goes to error-handling middleware.

// Error handling middleware:

// app.use((err, req, res, next) => {
//   res.status(500).json({ success: false, message: err.message });
// });















// const asyncHandler=(func)=>async (req, res, next)=>{
//   try {
//     await func(req,res,next);
//   } catch (error) {
//     res.status(error.code || 500).json({
//         success: false,
//         message:error.message
//     })
//   }
// }

// ref:  higher order function

// // Original async function
// const getUsers = async (req, res) => {
//   const users = await User.find();
//   res.json(users);
// };

// // Wrapper
// const asyncHandler = (func) => async (req, res, next) => {
//   try {
//     await func(req, res, next); // <-- runs original function
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // Route
// app.get("/users", asyncHandler(getUsers));
