class apiError extends Error{
   constructor(
    statusCode,
    message ="Something went Wrong",
    errors=[],
    statck=""
   ){
     super(message)
     this.statusCode=statusCode
     this.data=null
     this.message=message
     this.success=false;
     this.erros=errors;

     if(statck){
        this.stack=statck
     }else{
        Error.captureStackTrace(this, this.constructor);
     }
   }
}

export {apiError};























//Error is a built in class in node. there are alot of Error class. example: syntax error class, Reference Error class etc.