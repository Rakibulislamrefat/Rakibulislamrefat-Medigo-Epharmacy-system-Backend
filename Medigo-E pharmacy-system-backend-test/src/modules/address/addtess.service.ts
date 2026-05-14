import mongoose from "mongoose";
import Address from "./address.schema";
import { ApiError } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class AddressService {
  private static getAddressBook(userId: string) {
    return Address.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, addresses: [] } },
      { new: true, upsert: true },
    );
  }

  private static normalizeDefault(addresses: any[], defaultAddressId?: string) {
    const hasExplicitDefault = addresses.some((address: any) =>
      defaultAddressId ? String(address._id) === defaultAddressId : address.isDefault === true,
    );

    addresses.forEach((address: any, index: number) => {
      if (defaultAddressId) {
        address.isDefault = String(address._id) === defaultAddressId;
      } else if (hasExplicitDefault) {
        address.isDefault = address.isDefault === true;
      } else {
        address.isDefault = index === 0;
      }
    });
  }

  static async create(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");

    const addressBook: any = await this.getAddressBook(userId);
    if (addressBook.addresses.length >= 3) {
      throw new ApiError(400, "You can create a maximum of 3 addresses");
    }

    const shouldDefault = payload?.isDefault === true || addressBook.addresses.length === 0;
    if (shouldDefault) {
      addressBook.addresses.forEach((address: any) => {
        address.isDefault = false;
      });
    }

    addressBook.addresses.push({ ...payload, isDefault: shouldDefault });
    await addressBook.save();
    return addressBook.addresses[addressBook.addresses.length - 1];
  }

  static async list(userId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const addressBook: any = await this.getAddressBook(userId);
    return addressBook.addresses.sort((a: any, b: any) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  static async getById(userId: string, addressId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(addressId)) throw new ApiError(400, "Invalid address id");

    const addressBook: any = await this.getAddressBook(userId);
    const address = addressBook.addresses.id(addressId);
    if (!address) throw new ApiError(404, "Address not found");
    return address;
  }

  static async update(userId: string, addressId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(addressId)) throw new ApiError(400, "Invalid address id");

    const addressBook: any = await this.getAddressBook(userId);
    const address = addressBook.addresses.id(addressId);
    if (!address) throw new ApiError(404, "Address not found");

    if (payload?.isDefault === true) this.normalizeDefault(addressBook.addresses, addressId);

    Object.assign(address, payload);
    await addressBook.save();
    return address;
  }

  static async setDefault(userId: string, addressId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(addressId)) throw new ApiError(400, "Invalid address id");

    const addressBook: any = await this.getAddressBook(userId);
    const address = addressBook.addresses.id(addressId);
    if (!address) throw new ApiError(404, "Address not found");

    this.normalizeDefault(addressBook.addresses, addressId);
    await addressBook.save();
    return address;
  }

  static async remove(userId: string, addressId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(addressId)) throw new ApiError(400, "Invalid address id");

    const addressBook: any = await this.getAddressBook(userId);
    const address = addressBook.addresses.id(addressId);
    if (!address) throw new ApiError(404, "Address not found");

    const deletedAddress = address.toObject();
    address.deleteOne();
    this.normalizeDefault(addressBook.addresses);
    await addressBook.save();

    return deletedAddress;
  }
}
