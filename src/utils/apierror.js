class apiError extends Error{
   constructor(
    statusCode,
    message ="Something went Wrong",
    errors=[],
    stack=""
   ){
     super(message)
     this.statusCode=statusCode
     this.data=null
     this.message=message
     this.success=false;
     this.errors=errors;

     if(stack){
        this.stack=stack
     }else{
        Error.captureStackTrace(this, this.constructor);
     }
   }
}

export {apiError};























//Error is a built in class in node. there are alot of Error class. example: syntax error class, Reference Error class etc.