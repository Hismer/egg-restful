'use strict';
const { isInt, isBoolean, toBoolean } = require('validator');
const HttpErrorType = Symbol();

/**
 * 工具类
 */
module.exports = class Tools {
  /**
   * 构造方法
   * @param {*} ctx 上下文对象
   */
  constructor(ctx) {
    this.ctx = ctx;
  }

  /**
   * 创建Http错误对象
   * @param {string} msg 消息
   * @param {int} status 状态码
   * @return {*} Error
   */
  createHttpError(msg, status) {
    return {
      type: HttpErrorType,
      msg,
      status,
    };
  }

  /**
   * 检查是否是HTTP错误
   * @param {*} e 错误
   * @return {boolean} 真假
   */
  isHttpError(e) {
    return e.type === HttpErrorType;
  }

  /**
   * 读取Params参数
   * @param {string} name 值
   * @param {*} options 选项
   * @return {*} 结果
   */
  getParam(name, options) {
    const { params } = this.ctx;
    return this.getValue(params[name], options);
  }

  /**
   * 批量读取Param参数
   * @param {*} options 选项
   * @return {*} 结果
   */
  getParams(options) {
    const { params } = this.ctx;
    const values = Object.assign({}, params);
    for (const name in options) {
      values[name] = this.getParam(name, options[name]);
    }
    return values;
  }

  /**
   * 读取Body参数
   * @param {string} name 值
   * @param {*} options 选项
   * @return {*} 结果
   */
  getBody(name, options) {
    const { body } = this.ctx.request;
    return this.getValue(body[name], options);
  }

  /**
   * 批量读取Body参数
   * @param {*} options 选项
   * @return {*} 结果
   */
  getBodys(options) {
    const { body } = this.ctx.request;
    const values = Object.assign({}, body);
    for (const name in options) {
      values[name] = this.getBody(name, options[name]);
    }
    return values;
  }

  /**
   * 读取Query参数
   * @param {string} name 值
   * @param {*} options 选项
   * @return {*} 结果
   */
  getQuery(name, options) {
    const { query } = this.ctx;
    return this.getValue(query[name], options);
  }

  /**
   * 批量读取Query参数
   * @param {*} options 选项
   * @return {*} 结果
   */
  getQuerys(options) {
    const { query } = this.ctx;
    const values = Object.assign({}, query);
    for (const name in options) {
      values[name] = this.getQuery(name, options[name]);
    }
    return values;
  }

  /**
   * 读取参数
   * @param {string} value 值
   * @param {*} options 选项
   * @return {*} 结果
   */
  getValue(value, options) {
    // 解析参数
    const { require, error, validator, type } = Object.assign(
      {
        require: false,
        error: this.createHttpError('参数格式错误', 400),
      },
      options
    );
    // 空值处理
    if (value === undefined) {
      if (require) throw error;
      return options.default;
    }
    // 校验器执行
    if (validator) {
      if (validator instanceof Function) {
        if (!validator(value)) throw error;
      } else {
        const [ func, arg ] = validator;
        if (!func(value, arg)) throw error;
      }
    }
    // 类型转换
    if (!type) return value;
    if (type instanceof Function) return type(value);
    const [ func, ...args ] = type;
    return func(value, ...args);
  }

  /**
   * 响应数据
   * @param {*} body 内容
   * @param {*} status 状态
   */
  response(body, status = 200) {
    const { ctx } = this;
    ctx.status = status;
    ctx.body = body;
  }

  /**
   * 响应错误信息
   * @param {string} msg 内容
   * @param {*} status 状态
   */
  error(msg, status = 400) {
    this.response({ msg }, status);
  }

  /**
   * 创建RESTful资源API
   * @param {*} model 模型
   * @param {*} options 选项参数
   * @param {*} render 渲染方法
   * @param {*} append 渲染方法
   * @return {undefined}
   */
  async create(model, options, render = false) {
    // 查找创建对象
    const [ entity, status ] = await model.findOrCreate(options);
    if (!status) return this.error('资源已存在', 409);
    // 响应实体数据
    const data = await this.render(entity, render);
    this.response(data, 201);
  }

  /**
   * 更新RESTful资源API
   * @param {*} model 模型
   * @param {*} options 选项参数
   * @param {*} render 渲染方法
   * @return {undefined}
   */
  async update(model, options) {
    // 解析选项
    const { where, values } = options;

    // 查找对象
    const entity = await model.findOne({ where });
    if (!entity) return this.error('资源不存在', 404);

    // 执行更新操作
    for (const key in values) {
      if (values[key] === undefined) continue;
      entity[key] = values[key];
    }

    // 保存并响应结果
    await entity.save();
    this.response(undefined, 204);
  }

  /**
   * 删除RESTful资源API
   * @param {*} model 模型
   * @param {*} where 选项参数
   * @return {undefined}
   */
  async destroy(model, where) {
    // 查找对象
    const entity = await model.findOne({ where });
    if (!entity) return this.error('资源不存在', 404);
    // 响应结果
    await entity.destroy();
    this.response(undefined, 204);
  }

  /**
   * 查看RESTful资源API
   * @param {*} model 模型
   * @param {*} where 选项参数
   * @param {*} render 渲染方法
   * @param {*} append 渲染方法
   * @return {undefined}
   */
  async show(model, where, render, append) {
    // 查找对象
    const entity = await model.findOne({ where });
    if (!entity) return this.error('资源不存在', 404);
    // 响应结果
    let data = await this.render(entity, render);
    if (append) data = append(data);
    this.response(data, 200);
  }

  /**
   * 列出RESTful资源API
   * @param {*} model 模型
   * @param {*} options 选项参数
   * @param {*} render 渲染方法
   * @param {*} append 渲染方法
   */
  async index(model, options = {}, render, append = false) {
    // 解析参数
    const { limit, page, offset, with_data, with_total } = this.getQuerys({
      with_data: {
        require: false,
        default: true,
        validator: isBoolean,
        type: toBoolean,
      },
      with_total: {
        require: false,
        default: true,
        validator: isBoolean,
        type: toBoolean,
      },
      limit: {
        require: false,
        validator: [ isInt, { min: 1 }],
        type: parseInt,
      },
      page: {
        require: false,
        validator: [ isInt, { min: 1 }],
        type: parseInt,
      },
      offset: {
        require: false,
        validator: [ isInt, { min: 1 }],
        type: parseInt,
      },
    });

    // 附加分页参数
    if (page || offset) {
      options.limit = limit ? limit : 20;
      options.offset = page ? (page - 1) * options.limit : offset;
    } else if (limit) options.limit = limit;

    // 获取列表数据
    const data = [];
    if (with_data) {
      const list = await model.findAll(options);
      for (const entity of list) {
        data.push(await this.render(entity, render));
      }
    }

    // 附加统计结果
    const total = with_total ? await model.count(options) : undefined;
    let result = {
      data,
      meta: {
        limit: options.limit,
        page,
        offset: options.offset,
        total,
      },
    };
    if (append) result = append(result);
    this.response(result, 200);
  }

  /**
   * 渲染实体对象
   * @param {*} entity 实体
   * @param {*} render 渲染方法
   * @return {*} 对象
   */
  async render(entity, render) {
    if (render instanceof Function) {
      const data = render(entity);
      return data instanceof Promise ? await data : data;
    }
    return entity.toJSON();
  }
};
