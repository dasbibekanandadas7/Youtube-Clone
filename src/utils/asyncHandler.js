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


// HOF
// the function that is declared outside is written inside the function call in the above code 

// // A simple function that doubles a number
// const double = (n) => n * 2;

// // Higher-order function: takes a function, returns a new function
// const addOne = (fn) => {
//   return (x) => fn(x) + 1;
// };

// // Wrap double with addOne
// const doubleThenAddOne = addOne(double);

// // Use it
// console.log(doubleThenAddOne(5)); // 11
// // Explanation: double(5) = 10 → +1 = 11




// Suppose User.find() succeeds or returns null/empty.
// Here you throw a new error.
// In async functions, throw automatically rejects the promise.
// Promise.resolve(requestHandler(...)) wraps your async function.

// Since the promise is rejected (because of the throw), .catch(error) executes.

// Inside .catch, it calls next(error).







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
