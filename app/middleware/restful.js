'use strict';
const Tools = require('../../libs/tools');

// Http错误中间件
module.exports = () => async (ctx, next) => {
  ctx.restful = new Tools(ctx);
  try {
    await next(ctx);
  } catch (e) {
    const { msg, status } = e;
    if (!ctx.restful.isHttpError(e)) throw e;
    ctx.status = status;
    ctx.body = { msg };
  }
};
