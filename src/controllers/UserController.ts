import { Request, Response } from 'express';
import { User } from 'models/User';
import { UserService } from '../services/UserService';

export class UserController {
  constructor(private userService: UserService) {
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.insert = this.insert.bind(this);
    this.insertMany = this.insertMany.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }
  all(req: Request, res: Response) {  
    this.userService.all()
      .then(users => res.status(200).json(users))
      .catch(err => res.status(500).send(err));
  }
  load(req: Request, res: Response) {
    const id = req.params['id'];
    if (!id || id.length === 0) {
      return res.status(400).send('id cannot be empty');
    }
    this.userService.load(id)
      .then(user => {
        if (user) {
          res.status(200).json(user);
        } else {
          res.status(404).json(null);
        }
      })
      .catch(err => res.status(500).send(err));
  }
  insert(req: Request, res: Response) {
    const user = req.body;
    this.userService.insert(user)
      .then(result => res.status(200).json(result))
      .catch(err => res.status(500).send(err));
  }
  insertMany(req: Request, res: Response) {
    const users: User[]= [
      {
        id: "1",
        username: "1",
        email: "1",
        dateOfBirth: new Date("1974-11-16T00:00:00.000Z"),
      },
      {
        id: "2",
        username: "2",
        email: "2",
        dateOfBirth: new Date("1974-11-16T00:00:00.000Z"),
      },
      {
        id: "2",
        username: "3",
        email: "3",
        dateOfBirth: new Date("1974-11-16T00:00:00.000Z"),
      },
      {
        id: "4",
        username: "4",
        email: "4",
        dateOfBirth: new Date("1974-11-16T00:00:00.000Z"),
      },
    ];
    this.userService
      .insertMany(users)
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((err) => res.status(500).send(err));
  }
  update(req: Request, res: Response) {
    const id = req.params['id'];
    if (!id || id.length === 0) {
      return res.status(400).send('id cannot be empty');
    }
    const user = req.body;
    if (!user.id) {
      user.id = id;
    } else if (id !== user.id) {
      return res.status(400).send('body and url are not matched');
    }
    this.userService.update(user)
      .then(result => res.status(200).json(result))
      .catch(err => res.status(500).send(err));
  }
  delete(req: Request, res: Response) {
    const id = req.params['id'];
    if (!id || id.length === 0) {
      return res.status(400).send('id cannot be empty');
    }
    this.userService.delete(id)
      .then(result => res.status(200).json(result))
      .catch(err => res.status(500).send(err));
  }
}
